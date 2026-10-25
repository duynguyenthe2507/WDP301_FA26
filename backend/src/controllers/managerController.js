import AuditLog from '../models/AuditLog.js';
import Dispute from '../models/Dispute.js';
import Hotel from '../models/Hotel.js';
import HotelVerification from '../models/HotelVerification.js';
import Payment from '../models/Payment.js';
import RefundRequest from '../models/RefundRequest.js';

const getPaging = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const audit = (userId, action, entityType, entityId, metadata = {}) => AuditLog.create({ admin_id: userId, action, entityType, entityId, metadata });

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
    const [verificationPending, disputeOpen, refundPending] = await Promise.all([
      HotelVerification.countDocuments({ status: { $in: ['PENDING', 'ADDITIONAL_INFO_REQUIRED'] } }),
      Dispute.countDocuments({ status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] } }),
      RefundRequest.countDocuments({ status: { $in: ['REQUESTED', 'UNDER_REVIEW'] } }),
    ]);
    const recentActivity = await AuditLog.find({ admin_id: req.user._id }).sort({ createdAt: -1 }).limit(6);
    res.json({ stats: { verificationPending, disputeOpen, refundPending }, recentActivity });
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
    const verification = await HotelVerification.findById(req.params.id).populate('hotelId').populate('partnerId', 'fullName email phoneNumber').populate('reviewedBy', 'fullName email');
    if (!verification) return res.status(404).json({ message: 'Không tìm thấy hồ sơ xác minh.' });
    res.json({ verification });
  } catch (error) { next(error); }
};

export const reviewVerification = async (req, res, next) => {
  try {
    const { decision, note = '' } = req.body;
    const outcomes = { APPROVE: ['APPROVED', 'APPROVED'], REJECT: ['REJECTED', 'REJECTED'], REQUEST_INFO: ['ADDITIONAL_INFO_REQUIRED', 'ADDITIONAL_INFO_REQUIRED'] };
    const outcome = outcomes[decision];
    if (!outcome) return res.status(400).json({ message: 'Quyết định xác minh không hợp lệ.' });
    if (decision !== 'APPROVE' && !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập lý do.' });
    const verification = await HotelVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ message: 'Không tìm thấy hồ sơ xác minh.' });
    if (['APPROVED', 'REJECTED'].includes(verification.status)) return res.status(409).json({ message: 'Hồ sơ đã có quyết định cuối cùng.' });
    const hotel = await Hotel.findById(verification.hotelId);
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn.' });
    const now = new Date();
    verification.status = outcome[0]; verification.reviewNote = note.trim(); verification.reviewedBy = req.user._id; verification.reviewedAt = now;
    verification.history.push({ action: `HOTEL_VERIFICATION_${outcome[0]}`, note: note.trim(), performedBy: req.user._id });
    hotel.status = outcome[1]; hotel.verificationStatus = outcome[0]; hotel.verificationUpdatedAt = now;
    await Promise.all([verification.save(), hotel.save()]);
    await audit(req.user._id, `HOTEL_VERIFICATION_${outcome[0]}`, 'HOTEL_VERIFICATION', verification._id, { note: note.trim() });
    res.json({ message: 'Đã cập nhật kết quả xác minh.', verification });
  } catch (error) { next(error); }
};

export const getDisputes = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    if (req.query.assigned === 'me') filter.assignedTo = req.user._id;
    const result = await paged(Dispute, filter, req.query, [{ path: 'customerId', select: 'fullName email' }, { path: 'hotelId', select: 'name' }, { path: 'partnerId', select: 'fullName email' }]);
    res.json({ disputes: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const updateDispute = async (req, res, next) => {
  try {
    const { status, resolution, resolutionMessage, assignedToMe } = req.body;
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy tranh chấp.' });
    if (['RESOLVED', 'REJECTED'].includes(dispute.status)) return res.status(409).json({ message: 'Tranh chấp đã được đóng.' });
    if (status && !['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    if (['RESOLVED', 'REJECTED'].includes(status) && !resolutionMessage?.trim()) return res.status(400).json({ message: 'Cần nhập nội dung kết luận.' });
    if (assignedToMe) dispute.assignedTo = req.user._id;
    if (status) dispute.status = status;
    if (['RESOLVED', 'REJECTED'].includes(status)) dispute.resolution = { outcome: status === 'REJECTED' ? 'REJECTED' : resolution || 'UPHELD', message: resolutionMessage.trim(), resolvedBy: req.user._id, resolvedAt: new Date() };
    await dispute.save(); await audit(req.user._id, `DISPUTE_${dispute.status}`, 'DISPUTE', dispute._id);
    res.json({ message: 'Đã cập nhật tranh chấp.', dispute });
  } catch (error) { next(error); }
};

export const getRefunds = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(RefundRequest, filter, req.query, [{ path: 'customerId', select: 'fullName email' }, { path: 'hotelId', select: 'name' }, { path: 'partnerId', select: 'fullName email' }]);
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
      refund.status = 'APPROVED'; refund.approvedAmount = amount;
    }
    if (decision === 'REJECT') refund.status = 'REJECTED';
    if (decision === 'MARK_PROCESSED') {
      if (refund.status !== 'APPROVED') return res.status(409).json({ message: 'Chỉ yêu cầu đã duyệt mới có thể hoàn tiền.' });
      const payment = await Payment.create({ bookingId: refund.bookingId, transactionId: paymentReference.trim() || `REF-${refund._id}-${Date.now()}`, type: 'REFUND', amount: refund.approvedAmount, status: 'SUCCESS' });
      refund.status = 'PROCESSED'; refund.processedAt = new Date(); refund.paymentId = payment._id;
    }
    refund.reviewedBy = req.user._id; refund.reviewNote = note.trim(); refund.reviewedAt = new Date();
    await refund.save(); await audit(req.user._id, `REFUND_${refund.status}`, 'REFUND_REQUEST', refund._id, { decision });
    res.json({ message: 'Đã cập nhật yêu cầu hoàn tiền.', refund });
  } catch (error) { next(error); }
};
