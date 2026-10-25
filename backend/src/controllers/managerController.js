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
    if (!verification) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ xÃ¡c minh.' });
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
    if (!outcome) return res.status(400).json({ message: 'Quyáº¿t Ä‘á»‹nh xÃ¡c minh khÃ´ng há»£p lá»‡.' });
    if (decision !== 'APPROVE' && !note.trim()) return res.status(400).json({ message: 'Vui lÃ²ng nháº­p lÃ½ do.' });
    const verification = await HotelVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ xÃ¡c minh.' });
    if (['APPROVED', 'REJECTED'].includes(verification.status)) return res.status(409).json({ message: 'Há»“ sÆ¡ Ä‘Ã£ cÃ³ quyáº¿t Ä‘á»‹nh cuá»‘i cÃ¹ng.' });
    const hotel = await Hotel.findById(verification.hotelId);
    if (!hotel) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y khÃ¡ch sáº¡n thuá»™c há»“ sÆ¡ nÃ y.' });
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
    res.json({ message: 'ÄÃ£ cáº­p nháº­t káº¿t quáº£ xÃ¡c minh.', verification });
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
    if (!status) return res.status(400).json({ message: 'Quyáº¿t Ä‘á»‹nh xá»­ lÃ½ khÃ´ng há»£p lá»‡.' });
    if (decision !== 'APPROVE' && !note.trim()) return res.status(400).json({ message: 'Vui lÃ²ng nháº­p ghi chÃº xá»­ lÃ½.' });

    const request = await PartnerChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u thay Ä‘á»•i.' });
    if (!['PENDING', 'ADDITIONAL_INFO_REQUIRED'].includes(request.status)) return res.status(409).json({ message: 'YÃªu cáº§u nÃ y Ä‘Ã£ cÃ³ quyáº¿t Ä‘á»‹nh cuá»‘i cÃ¹ng.' });

    if (decision === 'APPROVE') {
      const hotel = await Hotel.findById(request.hotelId);
      if (!hotel) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y khÃ¡ch sáº¡n cá»§a yÃªu cáº§u.' });
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
    res.json({ message: 'ÄÃ£ cáº­p nháº­t yÃªu cáº§u thay Ä‘á»•i cá»§a Ä‘á»‘i tÃ¡c.', request });
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
    if (!message?.trim()) return res.status(400).json({ message: 'Vui lÃ²ng nháº­p ná»™i dung pháº£n há»“i.' });
    const allowedStatuses = ['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Tráº¡ng thÃ¡i ticket khÃ´ng há»£p lá»‡.' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y ticket há»— trá»£.' });
    if (ticket.status === 'RESOLVED') return res.status(409).json({ message: 'Ticket Ä‘Ã£ Ä‘Æ°á»£c giáº£i quyáº¿t.' });

    ticket.responses.push({ message: message.trim(), authorId: req.user._id });
    ticket.assignedTo = req.user._id;
    ticket.firstRespondedAt = ticket.firstRespondedAt || new Date();
    ticket.status = escalate ? 'ESCALATED' : status;
    await ticket.save();
    await audit(req.user._id, `SUPPORT_TICKET_${ticket.status}`, 'SUPPORT_TICKET', ticket._id, { escalate });
    res.json({ message: 'ÄÃ£ pháº£n há»“i ticket há»— trá»£.', ticket });
  } catch (error) { next(error); }
};

export const updateDispute = async (req, res, next) => {
  try {
    const { status, resolution, resolutionMessage, assignedToMe } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y tranh cháº¥p.' });
    if (['RESOLVED', 'REJECTED'].includes(dispute.status)) return res.status(409).json({ message: 'Tranh cháº¥p Ä‘Ã£ Ä‘Æ°á»£c Ä‘Ã³ng.' });
    const statuses = ['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED'];
    if (status && !statuses.includes(status)) return res.status(400).json({ message: 'Tráº¡ng thÃ¡i tranh cháº¥p khÃ´ng há»£p lá»‡.' });
    if (['RESOLVED', 'REJECTED'].includes(status) && !resolutionMessage?.trim()) return res.status(400).json({ message: 'Cáº§n nháº­p ná»™i dung káº¿t luáº­n.' });
    if (assignedToMe) dispute.assignedTo = req.user._id;
    if (status) dispute.status = status;
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      dispute.resolution = { outcome: status === 'REJECTED' ? 'REJECTED' : resolution || 'UPHELD', message: resolutionMessage.trim(), resolvedBy: req.user._id, resolvedAt: new Date() };
    }
    await dispute.save();
    await audit(req.user._id, `DISPUTE_${dispute.status}`, 'DISPUTE', dispute._id, { resolutionMessage });
    res.json({ message: 'ÄÃ£ cáº­p nháº­t tranh cháº¥p.', dispute });
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
    if (!refund) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u hoÃ n tiá»n.' });
    if (!['APPROVE', 'REJECT', 'MARK_PROCESSED'].includes(decision)) return res.status(400).json({ message: 'Quyáº¿t Ä‘á»‹nh hoÃ n tiá»n khÃ´ng há»£p lá»‡.' });
    if (decision === 'REJECT' && !note.trim()) return res.status(400).json({ message: 'Vui lÃ²ng nháº­p lÃ½ do tá»« chá»‘i.' });
    if (decision === 'APPROVE') {
      const amount = Number(approvedAmount);
      if (!Number.isFinite(amount) || amount < 0 || amount > refund.requestedAmount) return res.status(400).json({ message: 'Sá»‘ tiá»n duyá»‡t khÃ´ng há»£p lá»‡.' });
      refund.status = 'APPROVED';
      refund.approvedAmount = amount;
    }
    if (decision === 'REJECT') refund.status = 'REJECTED';
    if (decision === 'MARK_PROCESSED') {
      if (refund.status !== 'APPROVED') return res.status(409).json({ message: 'Chá»‰ yÃªu cáº§u Ä‘Ã£ duyá»‡t má»›i cÃ³ thá»ƒ hoÃ n tiá»n.' });
      const payment = await Payment.create({ bookingId: refund.bookingId, transactionId: paymentReference.trim() || `REF-${refund._id}-${Date.now()}`, type: 'REFUND', amount: refund.approvedAmount, status: 'SUCCESS' });
      refund.status = 'PROCESSED'; refund.processedAt = new Date(); refund.paymentId = payment._id;
    }
    refund.reviewedBy = req.user._id; refund.reviewNote = note.trim(); refund.reviewedAt = new Date();
    await refund.save();
    await audit(req.user._id, `REFUND_${refund.status}`, 'REFUND_REQUEST', refund._id, { decision, note: note.trim() });
    res.json({ message: 'ÄÃ£ cáº­p nháº­t yÃªu cáº§u hoÃ n tiá»n.', refund });
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
    if (!name?.trim() || !['PERCENTAGE', 'FIXED'].includes(calculationType) || !Number.isFinite(numericValue) || numericValue < 0 || (calculationType === 'PERCENTAGE' && numericValue > 100)) return res.status(400).json({ message: 'ThÃ´ng tin chÃ­nh sÃ¡ch hoa há»“ng khÃ´ng há»£p lá»‡.' });
    if (!effectiveFrom || Number.isNaN(new Date(effectiveFrom).getTime())) return res.status(400).json({ message: 'NgÃ y hiá»‡u lá»±c khÃ´ng há»£p lá»‡.' });
    if ((scope === 'PARTNER' && !partnerId) || (scope === 'HOTEL' && !hotelId)) return res.status(400).json({ message: 'Pháº¡m vi chÃ­nh sÃ¡ch cáº§n cÃ³ Ä‘á»‘i tÆ°á»£ng Ã¡p dá»¥ng.' });
    const policy = await CommissionPolicy.create({ name: name.trim(), calculationType, value: numericValue, scope, partnerId: partnerId || null, hotelId: hotelId || null, effectiveFrom, effectiveTo: effectiveTo || null, createdBy: req.user._id });
    await audit(req.user._id, 'COMMISSION_POLICY_CREATED', 'COMMISSION_POLICY', policy._id);
    res.status(201).json({ message: 'ÄÃ£ táº¡o chÃ­nh sÃ¡ch hoa há»“ng.', policy });
  } catch (error) { next(error); }
};

export const updateCommissionPolicy = async (req, res, next) => {
  try {
    const policy = await CommissionPolicy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y chÃ­nh sÃ¡ch hoa há»“ng.' });
    ['name', 'calculationType', 'value', 'effectiveFrom', 'effectiveTo', 'status'].forEach((key) => { if (req.body[key] !== undefined) policy[key] = req.body[key]; });
    if (policy.calculationType === 'PERCENTAGE' && Number(policy.value) > 100) return res.status(400).json({ message: 'Hoa há»“ng pháº§n trÄƒm khÃ´ng thá»ƒ vÆ°á»£t quÃ¡ 100%.' });
    await policy.save(); await audit(req.user._id, 'COMMISSION_POLICY_UPDATED', 'COMMISSION_POLICY', policy._id);
    res.json({ message: 'ÄÃ£ cáº­p nháº­t chÃ­nh sÃ¡ch hoa há»“ng.', policy });
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
    if (!partnerId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return res.status(400).json({ message: 'Partner hoáº·c ká»³ thanh toÃ¡n khÃ´ng há»£p lá»‡.' });
    const partner = await User.findOne({ _id: partnerId, role: 'HOTEL_PARTNER' });
    if (!partner) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y Ä‘á»‘i tÃ¡c khÃ¡ch sáº¡n.' });
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
      holdReason: holdCount ? `CÃ³ ${holdCount} tranh cháº¥p hoáº·c yÃªu cáº§u hoÃ n tiá»n Ä‘ang má»Ÿ.` : '',
      policyId: policyIds.length === 1 ? policyIds[0] : null,
    });
    await audit(req.user._id, 'PAYOUT_GENERATED', 'PAYOUT', payout._id);
    res.status(201).json({ message: 'ÄÃ£ táº¡o báº£ng kÃª payout chá» duyá»‡t.', payout });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'ÄÃ£ cÃ³ payout cho Ä‘á»‘i tÃ¡c trong ká»³ nÃ y.' }); next(error); }
};

export const reviewPayout = async (req, res, next) => {
  try {
    const { decision, note = '', paymentReference = '' } = req.body;
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y payout.' });
    if (!['APPROVE', 'REJECT', 'MARK_PAID'].includes(decision)) return res.status(400).json({ message: 'Quyáº¿t Ä‘á»‹nh payout khÃ´ng há»£p lá»‡.' });
    if (decision === 'REJECT' && !note.trim()) return res.status(400).json({ message: 'Vui lÃ²ng nháº­p lÃ½ do tá»« chá»‘i.' });
    if ((decision === 'APPROVE' || decision === 'REJECT') && payout.status !== 'PENDING_APPROVAL') return res.status(409).json({ message: 'Payout khÃ´ng chá» duyá»‡t.' });
    if (decision === 'MARK_PAID' && payout.status !== 'APPROVED') return res.status(409).json({ message: 'Chá»‰ payout Ä‘Ã£ duyá»‡t má»›i cÃ³ thá»ƒ Ä‘Ã¡nh dáº¥u Ä‘Ã£ chi tráº£.' });
    if (decision === 'APPROVE') payout.status = 'APPROVED';
    if (decision === 'REJECT') payout.status = 'REJECTED';
    if (decision === 'MARK_PAID') { payout.status = 'PAID'; payout.paidAt = new Date(); payout.paymentReference = paymentReference.trim(); }
    payout.reviewedBy = req.user._id; payout.reviewNote = note.trim(); payout.reviewedAt = new Date();
    await payout.save(); await audit(req.user._id, `PAYOUT_${payout.status}`, 'PAYOUT', payout._id, { note: note.trim() });
    res.json({ message: 'ÄÃ£ cáº­p nháº­t payout.', payout });
  } catch (error) { next(error); }
};

export const getManagerAuditLogs = async (req, res, next) => {
  try {
    const filter = { admin_id: req.user._id }; if (req.query.entityType) filter.entityType = req.query.entityType;
    const result = await paged(AuditLog, filter, req.query);
    res.json({ logs: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

