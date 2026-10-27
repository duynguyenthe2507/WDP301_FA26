import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import CommissionPolicy from '../models/CommissionPolicy.js';
import Dispute from '../models/Dispute.js';
import Hotel from '../models/Hotel.js';
import HotelVerification from '../models/HotelVerification.js';
import Payment from '../models/Payment.js';
import Payout from '../models/Payout.js';
import PartnerChangeRequest from '../models/PartnerChangeRequest.js';
import RefundRequest from '../models/RefundRequest.js';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';

const getPaging = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const audit = (userId, action, entityType, entityId, metadata = {}) => AuditLog.create({
  admin_id: userId,
  action,
  entityType,
  entityId,
  metadata,
});

const paged = async (model, filter, query, populates = []) => {
  const { page, limit, skip } = getPaging(query);
  let records = model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  populates.forEach((populate) => { records = records.populate(populate); });
  const [items, total] = await Promise.all([records, model.countDocuments(filter)]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

export const pingManager = (req, res) => res.json({ message: 'Operations Manager API works!' });

export const getDashboard = async (req, res, next) => {
  try {
    const [verificationPending, disputeOpen, refundPending, payoutPending, recentActivity] = await Promise.all([
      HotelVerification.countDocuments({ status: { $in: ['PENDING', 'ADDITIONAL_INFO_REQUIRED'] } }),
      Dispute.countDocuments({ status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] } }),
      RefundRequest.countDocuments({ status: { $in: ['REQUESTED', 'UNDER_REVIEW'] } }),
      Payout.countDocuments({ status: 'PENDING_APPROVAL' }),
      AuditLog.find({ admin_id: req.user._id }).sort({ createdAt: -1 }).limit(6),
    ]);
    res.json({ stats: { verificationPending, disputeOpen, refundPending, payoutPending }, recentActivity });
  } catch (error) { next(error); }
};

export const getVerifications = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(HotelVerification, filter, req.query, [
      { path: 'hotelId', select: 'name provinceCity address status starRating' },
      { path: 'partnerId', select: 'fullName email phoneNumber' },
      { path: 'reviewedBy', select: 'fullName email' },
    ]);
    res.json({ verifications: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const getVerificationById = async (req, res, next) => {
  try {
    const verification = await HotelVerification.findById(req.params.id)
      .populate('hotelId').populate('partnerId', 'fullName email phoneNumber')
      .populate('reviewedBy', 'fullName email').populate('history.performedBy', 'fullName email');
    if (!verification) return res.status(404).json({ message: 'Không tìm thấy hồ sơ xác minh.' });
    res.json({ verification });
  } catch (error) { next(error); }
};

export const reviewVerification = async (req, res, next) => {
  try {
    const { decision, note = '' } = req.body;
    const outcomes = {
      APPROVE: ['APPROVED', 'APPROVED', 'HOTEL_VERIFICATION_APPROVED'],
      REJECT: ['REJECTED', 'REJECTED', 'HOTEL_VERIFICATION_REJECTED'],
      REQUEST_INFO: ['ADDITIONAL_INFO_REQUIRED', 'ADDITIONAL_INFO_REQUIRED', 'HOTEL_VERIFICATION_INFO_REQUESTED'],
    };
    const outcome = outcomes[decision];
    if (!outcome) return res.status(400).json({ message: 'Quyết định xác minh không hợp lệ.' });
    if (decision !== 'APPROVE' && !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập lý do.' });
    const verification = await HotelVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ message: 'Không tìm thấy hồ sơ xác minh.' });
    if (['APPROVED', 'REJECTED'].includes(verification.status)) return res.status(409).json({ message: 'Hồ sơ đã có quyết định cuối cùng.' });
    const hotel = await Hotel.findById(verification.hotelId);
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn thuộc hồ sơ này.' });
    const now = new Date();
    verification.status = outcome[0];
    verification.reviewNote = note.trim();
    verification.reviewedBy = req.user._id;
    verification.reviewedAt = now;
    verification.history.push({ action: outcome[2], note: note.trim(), performedBy: req.user._id });
    hotel.status = outcome[1];
    hotel.verificationStatus = outcome[0];
    hotel.verificationUpdatedAt = now;
    await Promise.all([verification.save(), hotel.save()]);
    await audit(req.user._id, outcome[2], 'HOTEL_VERIFICATION', verification._id, { note: note.trim() });
    res.json({ message: 'Đã cập nhật kết quả xác minh.', verification });
  } catch (error) { next(error); }
};

export const getDisputes = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assigned === 'me') filter.assignedTo = req.user._id;
    const result = await paged(Dispute, filter, req.query, [
      { path: 'customerId', select: 'fullName email' }, { path: 'hotelId', select: 'name' },
      { path: 'partnerId', select: 'fullName email' }, { path: 'assignedTo', select: 'fullName email' },
    ]);
    res.json({ disputes: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const getPartnerChangeRequests = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(PartnerChangeRequest, filter, req.query, [
      { path: 'hotelId', select: 'name address provinceCity status' },
      { path: 'partnerId', select: 'fullName email phoneNumber' },
      { path: 'reviewedBy', select: 'fullName email' },
    ]);
    res.json({ requests: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const reviewPartnerChangeRequest = async (req, res, next) => {
  try {
    const { decision, note = '' } = req.body;
    const outcomes = { APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_INFO: 'ADDITIONAL_INFO_REQUIRED' };
    const status = outcomes[decision];
    if (!status) return res.status(400).json({ message: 'Quyết định xử lý không hợp lệ.' });
    if (decision !== 'APPROVE' && !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập ghi chú xử lý.' });

    const request = await PartnerChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu thay đổi.' });
    if (!['PENDING', 'ADDITIONAL_INFO_REQUIRED'].includes(request.status)) return res.status(409).json({ message: 'Yêu cầu này đã có quyết định cuối cùng.' });

    if (decision === 'APPROVE') {
      const hotel = await Hotel.findById(request.hotelId);
      if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn của yêu cầu.' });
      const allowedFields = new Set(['name', 'address', 'legalProfile']);
      request.changes.forEach((change) => {
        if (allowedFields.has(change.field)) hotel[change.field] = change.proposedValue;
      });
      await hotel.save();
    }

    request.status = status;
    request.decisionNote = note.trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    await audit(req.user._id, `PARTNER_CHANGE_REQUEST_${status}`, 'PARTNER_CHANGE_REQUEST', request._id, { note: note.trim() });
    res.json({ message: 'Đã cập nhật yêu cầu thay đổi của đối tác.', request });
  } catch (error) { next(error); }
};

export const getSupportTickets = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(SupportTicket, filter, req.query, [
      { path: 'partnerId', select: 'fullName email phoneNumber' },
      { path: 'hotelId', select: 'name' },
      { path: 'assignedTo', select: 'fullName email' },
      { path: 'responses.authorId', select: 'fullName email' },
    ]);
    const now = Date.now();
    const tickets = result.items.map((ticket) => ({
      ...ticket.toObject(),
      isOverdue: !ticket.firstRespondedAt && now - new Date(ticket.createdAt).getTime() > 24 * 60 * 60 * 1000,
    }));
    res.json({ tickets, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const respondToSupportTicket = async (req, res, next) => {
  try {
    const { message, status = 'RESOLVED', escalate = false } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });
    const allowedStatuses = ['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Trạng thái ticket không hợp lệ.' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy ticket hỗ trợ.' });
    if (ticket.status === 'RESOLVED') return res.status(409).json({ message: 'Ticket đã được giải quyết.' });

    ticket.responses.push({ message: message.trim(), authorId: req.user._id });
    ticket.assignedTo = req.user._id;
    ticket.firstRespondedAt = ticket.firstRespondedAt || new Date();
    ticket.status = escalate ? 'ESCALATED' : status;
    await ticket.save();
    await audit(req.user._id, `SUPPORT_TICKET_${ticket.status}`, 'SUPPORT_TICKET', ticket._id, { escalate });
    res.json({ message: 'Đã phản hồi ticket hỗ trợ.', ticket });
  } catch (error) { next(error); }
};

export const updateDispute = async (req, res, next) => {
  try {
    const { status, resolution, resolutionMessage, assignedToMe } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy tranh chấp.' });
    if (['RESOLVED', 'REJECTED'].includes(dispute.status)) return res.status(409).json({ message: 'Tranh chấp đã được đóng.' });
    const statuses = ['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED'];
    if (status && !statuses.includes(status)) return res.status(400).json({ message: 'Trạng thái tranh chấp không hợp lệ.' });
    if (['RESOLVED', 'REJECTED'].includes(status) && !resolutionMessage?.trim()) return res.status(400).json({ message: 'Cần nhập nội dung kết luận.' });
    if (assignedToMe) dispute.assignedTo = req.user._id;
    if (status) dispute.status = status;
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      dispute.resolution = { outcome: status === 'REJECTED' ? 'REJECTED' : resolution || 'UPHELD', message: resolutionMessage.trim(), resolvedBy: req.user._id, resolvedAt: new Date() };
    }
    await dispute.save();
    await audit(req.user._id, `DISPUTE_${dispute.status}`, 'DISPUTE', dispute._id, { resolutionMessage });
    res.json({ message: 'Đã cập nhật tranh chấp.', dispute });
  } catch (error) { next(error); }
};

export const getRefunds = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(RefundRequest, filter, req.query, [
      { path: 'customerId', select: 'fullName email' }, { path: 'hotelId', select: 'name' },
      { path: 'partnerId', select: 'fullName email' }, { path: 'disputeId', select: 'bookingCode category status' },
    ]);
    res.json({ refunds: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const reviewRefund = async (req, res, next) => {
  try {
    const { decision, approvedAmount, note = '', paymentReference = '' } = req.body;
    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoàn tiền.' });
    if (!['APPROVE', 'REJECT', 'MARK_PROCESSED'].includes(decision)) return res.status(400).json({ message: 'Quyết định hoàn tiền không hợp lệ.' });
    if (decision === 'REJECT' && !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối.' });
    if (decision === 'APPROVE') {
      const amount = Number(approvedAmount);
      if (!Number.isFinite(amount) || amount < 0 || amount > refund.requestedAmount) return res.status(400).json({ message: 'Số tiền duyệt không hợp lệ.' });
      refund.status = 'APPROVED';
      refund.approvedAmount = amount;
    }
    if (decision === 'REJECT') refund.status = 'REJECTED';
    if (decision === 'MARK_PROCESSED') {
      if (refund.status !== 'APPROVED') return res.status(409).json({ message: 'Chỉ yêu cầu đã duyệt mới có thể hoàn tiền.' });
      const payment = await Payment.create({ bookingId: refund.bookingId, transactionId: paymentReference.trim() || `REF-${refund._id}-${Date.now()}`, type: 'REFUND', amount: refund.approvedAmount, status: 'SUCCESS' });
      refund.status = 'PROCESSED'; refund.processedAt = new Date(); refund.paymentId = payment._id;
    }
    refund.reviewedBy = req.user._id; refund.reviewNote = note.trim(); refund.reviewedAt = new Date();
    await refund.save();
    await audit(req.user._id, `REFUND_${refund.status}`, 'REFUND_REQUEST', refund._id, { decision, note: note.trim() });
    res.json({ message: 'Đã cập nhật yêu cầu hoàn tiền.', refund });
  } catch (error) { next(error); }
};

export const getCommissionPolicies = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const policies = await CommissionPolicy.find(filter).populate('partnerId', 'fullName email').populate('hotelId', 'name').populate('createdBy', 'fullName email').sort({ effectiveFrom: -1 });
    res.json({ policies });
  } catch (error) { next(error); }
};

export const getHotelPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: 'HOTEL_PARTNER', status: 'ACTIVE' })
      .select('fullName email phoneNumber')
      .sort({ fullName: 1 });
    res.json({ partners });
  } catch (error) { next(error); }
};

export const createCommissionPolicy = async (req, res, next) => {
  try {
    const { name, calculationType, value, scope = 'GLOBAL', partnerId, hotelId, effectiveFrom, effectiveTo } = req.body;
    const numericValue = Number(value);
    if (!name?.trim() || !['PERCENTAGE', 'FIXED'].includes(calculationType) || !Number.isFinite(numericValue) || numericValue < 0 || (calculationType === 'PERCENTAGE' && numericValue > 100)) return res.status(400).json({ message: 'Thông tin chính sách hoa hồng không hợp lệ.' });
    if (!effectiveFrom || Number.isNaN(new Date(effectiveFrom).getTime())) return res.status(400).json({ message: 'Ngày hiệu lực không hợp lệ.' });
    if ((scope === 'PARTNER' && !partnerId) || (scope === 'HOTEL' && !hotelId)) return res.status(400).json({ message: 'Phạm vi chính sách cần có đối tượng áp dụng.' });
    const policy = await CommissionPolicy.create({ name: name.trim(), calculationType, value: numericValue, scope, partnerId: partnerId || null, hotelId: hotelId || null, effectiveFrom, effectiveTo: effectiveTo || null, createdBy: req.user._id });
    await audit(req.user._id, 'COMMISSION_POLICY_CREATED', 'COMMISSION_POLICY', policy._id);
    res.status(201).json({ message: 'Đã tạo chính sách hoa hồng.', policy });
  } catch (error) { next(error); }
};

export const updateCommissionPolicy = async (req, res, next) => {
  try {
    const policy = await CommissionPolicy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Không tìm thấy chính sách hoa hồng.' });
    ['name', 'calculationType', 'value', 'effectiveFrom', 'effectiveTo', 'status'].forEach((key) => { if (req.body[key] !== undefined) policy[key] = req.body[key]; });
    if (policy.calculationType === 'PERCENTAGE' && Number(policy.value) > 100) return res.status(400).json({ message: 'Hoa hồng phần trăm không thể vượt quá 100%.' });
    await policy.save(); await audit(req.user._id, 'COMMISSION_POLICY_UPDATED', 'COMMISSION_POLICY', policy._id);
    res.json({ message: 'Đã cập nhật chính sách hoa hồng.', policy });
  } catch (error) { next(error); }
};

export const getPayouts = async (req, res, next) => {
  try {
    const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.partnerId) filter.partnerId = req.query.partnerId;
    const result = await paged(Payout, filter, req.query, [{ path: 'partnerId', select: 'fullName email' }, { path: 'policyId', select: 'name calculationType value' }, { path: 'reviewedBy', select: 'fullName email' }]);
    res.json({ payouts: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const generatePayout = async (req, res, next) => {
  try {
    const { partnerId, periodStart, periodEnd } = req.body;
    const start = new Date(periodStart); const end = new Date(periodEnd);
    if (!partnerId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return res.status(400).json({ message: 'Partner hoặc kỳ thanh toán không hợp lệ.' });
    const partner = await User.findOne({ _id: partnerId, role: 'HOTEL_PARTNER' });
    if (!partner) return res.status(404).json({ message: 'Không tìm thấy đối tác khách sạn.' });
    const hotelIds = (await Hotel.find({ ownerId: partnerId }).select('_id')).map((hotel) => hotel._id.toString());
    const bookings = await Booking.find({ hotelId: { $in: hotelIds }, paymentStatus: 'PAID', bookingStatus: { $in: ['CONFIRMED', 'COMPLETED'] }, checkOutDate: { $gte: start, $lte: end } });
    const bookingIds = bookings.map((booking) => booking._id);
    const grossRevenue = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
    const [refunds, openDisputes, openRefunds] = await Promise.all([
      RefundRequest.find({ bookingId: { $in: bookingIds }, status: 'PROCESSED' }),
      Dispute.find({ bookingId: { $in: bookingIds }, status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] } }),
      RefundRequest.find({ bookingId: { $in: bookingIds }, status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'] } }),
    ]);
    const refundAdjustment = refunds.reduce((sum, refund) => sum + Number(refund.approvedAmount || 0), 0);
    const scopePriority = { HOTEL: 3, PARTNER: 2, GLOBAL: 1 };
    const commissionBreakdown = await Promise.all(bookings.map(async (booking) => {
      const bookedAt = booking.createdAt || start;
      const policies = await CommissionPolicy.find({
        status: 'ACTIVE',
        effectiveFrom: { $lte: bookedAt },
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: bookedAt } },
        ],
        $and: [{ $or: [
          { scope: 'GLOBAL' },
          { scope: 'PARTNER', partnerId },
          { scope: 'HOTEL', hotelId: booking.hotelId },
        ] }],
      }).sort({ effectiveFrom: -1 });
      const policy = policies.sort((left, right) => scopePriority[right.scope] - scopePriority[left.scope])[0];
      const revenue = Number(booking.totalAmount || 0);
      const amount = policy
        ? (policy.calculationType === 'PERCENTAGE' ? Math.round((revenue * policy.value) / 100) : Number(policy.value))
        : 0;
      return { bookingId: booking._id, policyId: policy?._id || null, rate: Number(policy?.value || 0), amount };
    }));
    const commissionAmount = commissionBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const policyIds = [...new Set(commissionBreakdown.filter((item) => item.policyId).map((item) => String(item.policyId)))];
    const holdCount = openDisputes.length + openRefunds.length;
    const payout = await Payout.create({
      partnerId,
      periodStart: start,
      periodEnd: end,
      bookingIds,
      commissionBreakdown,
      grossRevenue,
      refundAdjustment,
      commissionAmount,
      netAmount: Math.max(0, grossRevenue - refundAdjustment - commissionAmount),
      status: holdCount ? 'ON_HOLD' : 'PENDING_APPROVAL',
      holdReason: holdCount ? `Có ${holdCount} tranh chấp hoặc yêu cầu hoàn tiền đang mở.` : '',
      policyId: policyIds.length === 1 ? policyIds[0] : null,
    });
    await audit(req.user._id, 'PAYOUT_GENERATED', 'PAYOUT', payout._id);
    res.status(201).json({ message: 'Đã tạo bảng kê payout chờ duyệt.', payout });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Đã có payout cho đối tác trong kỳ này.' }); next(error); }
};

export const reviewPayout = async (req, res, next) => {
  try {
    const { decision, note = '', paymentReference = '' } = req.body;
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: 'Không tìm thấy payout.' });
    if (!['APPROVE', 'REJECT', 'MARK_PAID'].includes(decision)) return res.status(400).json({ message: 'Quyết định payout không hợp lệ.' });
    if (decision === 'REJECT' && !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối.' });
    if ((decision === 'APPROVE' || decision === 'REJECT') && payout.status !== 'PENDING_APPROVAL') return res.status(409).json({ message: 'Payout không chờ duyệt.' });
    if (decision === 'MARK_PAID' && payout.status !== 'APPROVED') return res.status(409).json({ message: 'Chỉ payout đã duyệt mới có thể đánh dấu đã chi trả.' });
    if (decision === 'APPROVE') payout.status = 'APPROVED';
    if (decision === 'REJECT') payout.status = 'REJECTED';
    if (decision === 'MARK_PAID') { payout.status = 'PAID'; payout.paidAt = new Date(); payout.paymentReference = paymentReference.trim(); }
    payout.reviewedBy = req.user._id; payout.reviewNote = note.trim(); payout.reviewedAt = new Date();
    await payout.save(); await audit(req.user._id, `PAYOUT_${payout.status}`, 'PAYOUT', payout._id, { note: note.trim() });
    res.json({ message: 'Đã cập nhật payout.', payout });
  } catch (error) { next(error); }
};

export const getManagerAuditLogs = async (req, res, next) => {
  try {
    const filter = { admin_id: req.user._id }; if (req.query.entityType) filter.entityType = req.query.entityType;
    const result = await paged(AuditLog, filter, req.query);
    res.json({ logs: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

