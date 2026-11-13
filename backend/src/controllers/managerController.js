import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import BookingCancellation from '../models/BookingCancellation.js';
import CommissionPolicy from '../models/CommissionPolicy.js';
import Dispute from '../models/Dispute.js';
import Hotel from '../models/Hotel.js';
import HotelVerification from '../models/HotelVerification.js';
import Payment from '../models/Payment.js';
import Payout from '../models/Payout.js';
import RefundRequest from '../models/RefundRequest.js';
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
      { path: 'hotelId', select: 'name provinceCity address status starRating description images amenities cancellationPolicy roomTypes' },
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
    // [trạng thái hồ sơ, trạng thái khách sạn (Hotel chỉ có PENDING/ACTIVE/REJECTED), hành động audit]
    const outcomes = {
      APPROVE: ['APPROVED', 'ACTIVE', 'HOTEL_VERIFICATION_APPROVED'],
      REJECT: ['REJECTED', 'REJECTED', 'HOTEL_VERIFICATION_REJECTED'],
      REQUEST_INFO: ['ADDITIONAL_INFO_REQUIRED', null, 'HOTEL_VERIFICATION_INFO_REQUESTED'],
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
    if (outcome[1]) hotel.status = outcome[1];
    await Promise.all([verification.save(), hotel.save()]);

    await audit(req.user._id, outcome[2], 'HOTEL_VERIFICATION', verification._id, { note: note.trim(), hotelName: hotel.name });
    res.json({ message: 'Đã cập nhật kết quả xác minh.', verification });
  } catch (error) { next(error); }
};

export const getDisputes = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assigned === 'me') filter.assignedTo = req.user._id;
    const result = await paged(Dispute, filter, req.query, [
      { path: 'customerId', select: 'fullName email phoneNumber avatarUrl' },
      { path: 'bookingId', select: 'bookingCode bookerFullName bookerPhone bookerEmail guestFullName guestPhone isSelfGuest checkInDate checkOutDate totalNights totalAmount bookingStatus paymentStatus specialRequests' },
      { path: 'hotelId', select: 'name address provinceCity starRating images cancellationPolicy' },
      { path: 'partnerId', select: 'fullName email phoneNumber' },
      { path: 'assignedTo', select: 'fullName email' },
      { path: 'responses.respondedBy', select: 'fullName email role' },
      { path: 'resolution.resolvedBy', select: 'fullName email' },
    ]);

    const disputeIds = result.items.map((item) => item._id);
    const bookingIds = result.items.map((item) => item.bookingId?._id || item.bookingId).filter(Boolean);
    const compensations = await RefundRequest.find({
      $or: [
        { disputeId: { $in: disputeIds } },
        { bookingId: { $in: bookingIds } },
      ],
    }).sort({ createdAt: -1 }).lean();

    // Số lần mỗi khách đã bị bác bỏ vì cung cấp thông tin sai, để Manager cân nhắc khi phán quyết
    const customerIds = [...new Set(result.items.map((item) => String(item.customerId?._id || item.customerId)))];
    const falseClaims = await Dispute.aggregate([
      { $match: { customerId: { $in: customerIds.map((id) => new mongoose.Types.ObjectId(id)) }, 'resolution.rejectReason': 'FALSE_INFORMATION' } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]);
    const falseClaimOf = (customerId) => falseClaims.find((row) => String(row._id) === String(customerId))?.count || 0;

    const disputes = result.items.map((doc) => {
      const item = doc.toObject ? doc.toObject() : doc;
      const bId = item.bookingId?._id || item.bookingId;
      const comp = compensations.find((c) => (c.disputeId && String(c.disputeId) === String(item._id)) || (bId && String(c.bookingId) === String(bId)));
      return { ...item, compensation: comp || null, customerFalseClaimCount: falseClaimOf(item.customerId?._id || item.customerId) };
    });

    res.json({ disputes, pagination: result.pagination });
  } catch (error) { next(error); }
};

// Bồi thường khiếu nại tối đa 10% giá trị đơn (khớp COMPENSATION_MAX_RATE ở DisputeResolutionPage)
const COMPENSATION_MAX_RATE = 0.1;

export const updateDispute = async (req, res, next) => {
  try {
    const {
      status,
      resolution,
      rejectReason,
      resolutionMessage,
      assignedToMe,
      message,
      customerMessage,
      partnerMessage,
      compensationAmount,
      compensationReason,
      processCompensationNow,
    } = req.body;

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy tranh chấp.' });
    if (['RESOLVED', 'REJECTED', 'WITHDRAWN'].includes(dispute.status)) {
      return res.status(409).json({ message: 'Tranh chấp đã được đóng.' });
    }

    const statuses = ['IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED'];
    if (status && !statuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái tranh chấp không hợp lệ.' });
    }
    if (['RESOLVED', 'REJECTED'].includes(status) && !resolutionMessage?.trim()) {
      return res.status(400).json({ message: 'Cần nhập nội dung phán quyết / kết luận.' });
    }

    const oldStatus = dispute.status;
    if (assignedToMe || !dispute.assignedTo) dispute.assignedTo = req.user._id;
    if (status) dispute.status = status;

    const now = new Date();

    // Ghi nhận trao đổi của Operations Manager vào luồng trao đổi chung (hiển thị cho cả Partner và Customer)
    if (message?.trim()) {
      dispute.responses.push({
        message: message.trim(),
        respondedBy: req.user._id,
        respondedAt: now,
      });
    }

    // Nếu đưa ra phán quyết cuối cùng
    let createdCompensation = null;
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      const finalOutcome = status === 'REJECTED' ? 'REJECTED' : (resolution || 'UPHELD');
      dispute.resolution = {
        outcome: finalOutcome,
        message: resolutionMessage.trim(),
        rejectReason: status === 'REJECTED' && rejectReason === 'FALSE_INFORMATION' ? 'FALSE_INFORMATION' : '',
        customerNotice: customerMessage?.trim() || '',
        partnerNotice: partnerMessage?.trim() || '',
        resolvedBy: req.user._id,
        resolvedAt: now,
      };

      // Lưu thông báo phán quyết vào timeline trao đổi nếu chưa trùng với message
      if (!message?.trim()) {
        const outcomeLabel = {
          UPHELD: 'Chấp nhận khiếu nại của khách hàng',
          PARTIALLY_UPHELD: 'Chấp nhận một phần khiếu nại',
          REJECTED: rejectReason === 'FALSE_INFORMATION' ? 'Bác bỏ khiếu nại (Khách cung cấp thông tin sai sự thật)' : 'Bác bỏ khiếu nại (Khách sạn đúng)',
          NO_ACTION: 'Hòa giải / Đóng hồ sơ',
        }[finalOutcome] || finalOutcome;

        dispute.responses.push({
          message: `[Phán quyết từ Bộ phận Vận hành - ${outcomeLabel}]: ${resolutionMessage.trim()}`,
          respondedBy: req.user._id,
          respondedAt: now,
        });
      }

      // Tự động khởi tạo / cập nhật khoản bồi thường cho khách hàng nếu có số tiền bồi thường > 0
      const compAmt = Number(compensationAmount);
      // Chỉ chấp nhận (toàn phần hoặc một phần) mới phát sinh bồi thường; bác bỏ và hòa giải thì không
      if (Number.isFinite(compAmt) && compAmt > 0 && ['UPHELD', 'PARTIALLY_UPHELD'].includes(finalOutcome)) {
        const bookingTotal = Number((await Booking.findById(dispute.bookingId).select('totalAmount').lean())?.totalAmount || 0);
        const maxCompensation = Math.round(bookingTotal * COMPENSATION_MAX_RATE);
        if (compAmt > maxCompensation) {
          return res.status(400).json({ message: `Số tiền bồi thường tối đa ${COMPENSATION_MAX_RATE * 100}% giá trị đơn (${maxCompensation.toLocaleString('vi-VN')} VND).` });
        }
        const compReason = (compensationReason || `[Bồi thường theo phán quyết tranh chấp #${dispute.bookingCode}] ${resolutionMessage}`).trim();
        let refundDoc = await RefundRequest.findOne({
          $or: [{ disputeId: dispute._id }, { bookingId: dispute.bookingId }],
          status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'] },
        });

        if (!refundDoc) {
          refundDoc = new RefundRequest({
            bookingId: dispute.bookingId,
            disputeId: dispute._id,
            customerId: dispute.customerId,
            hotelId: dispute.hotelId,
            partnerId: dispute.partnerId,
            requestedAmount: compAmt,
            approvedAmount: compAmt,
            reason: compReason,
            status: processCompensationNow ? 'PROCESSED' : 'APPROVED',
            reviewedBy: req.user._id,
            reviewNote: resolutionMessage.trim(),
            reviewedAt: now,
          });
        } else {
          refundDoc.disputeId = dispute._id;
          refundDoc.approvedAmount = compAmt;
          refundDoc.requestedAmount = Math.max(refundDoc.requestedAmount, compAmt);
          refundDoc.reason = compReason;
          refundDoc.status = processCompensationNow ? 'PROCESSED' : 'APPROVED';
          refundDoc.reviewedBy = req.user._id;
          refundDoc.reviewNote = resolutionMessage.trim();
          refundDoc.reviewedAt = now;
        }

        if (processCompensationNow) {
          const payment = await Payment.create({
            bookingId: dispute.bookingId,
            txnRef: `COMP-${dispute.bookingCode}-${Date.now()}`,
            type: 'REFUND',
            amount: compAmt,
            status: 'SUCCESS',
            payDate: now,
          });
          refundDoc.processedAt = now;
          refundDoc.paymentId = payment._id;
          await Booking.updateOne({ _id: dispute.bookingId }, { paymentStatus: 'REFUNDED' });
        }

        createdCompensation = await refundDoc.save();
      }
    }

    await dispute.save();

    await audit(req.user._id, `DISPUTE_${dispute.status}`, 'DISPUTE', dispute._id, {
      oldStatus,
      newStatus: dispute.status,
      resolution: dispute.resolution?.outcome || null,
      rejectReason: dispute.resolution?.rejectReason || null,
      resolutionMessage: resolutionMessage || message || '',
      compensationAmount: createdCompensation?.approvedAmount || 0,
    });

    res.json({
      message: 'Đã cập nhật tranh chấp và gửi phản hồi cho hai bên.',
      dispute,
      compensation: createdCompensation,
    });
  } catch (error) { next(error); }
};

// Tìm kiếm đơn đặt phòng để kiểm tra sai lệch thông tin khách hàng / khách sạn và lập bồi thường
export const getManagerBookings = async (req, res, next) => {
  try {
    const { q = '', hotelId = '' } = req.query;
    const filter = {};
    if (hotelId) filter.hotelId = hotelId;
    if (q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { bookingCode: regex },
        { bookerFullName: regex },
        { bookerEmail: regex },
        { bookerPhone: regex },
        { guestFullName: regex },
        { hotelName: regex },
      ];
    }

    const bookings = await Booking.find(filter)
      .populate('customerId', 'fullName email phoneNumber status')
      .populate('hotelId', 'name address provinceCity starRating ownerId')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const bookingIds = bookings.map((b) => b._id);
    const [existingRefunds, existingDisputes] = await Promise.all([
      RefundRequest.find({ bookingId: { $in: bookingIds } }).lean(),
      Dispute.find({ bookingId: { $in: bookingIds } }).select('bookingId bookingCode category status description').lean(),
    ]);

    const enriched = bookings.map((b) => ({
      ...b,
      existingRefund: existingRefunds.find((r) => String(r.bookingId) === String(b._id)) || null,
      existingDispute: existingDisputes.find((d) => String(d.bookingId) === String(b._id)) || null,
    }));

    res.json({ bookings: enriched });
  } catch (error) { next(error); }
};

// Tạo hồ sơ bồi thường cho khách hàng (khi nhập sai thông tin khách hàng / thông tin khách sạn không đúng / sự cố)
export const createManagerCompensation = async (req, res, next) => {
  try {
    const {
      bookingId,
      disputeId,
      requestedAmount,
      reason,
      issueType = 'INCORRECT_CUSTOMER_INFO',
      customerCorrection,
      autoApprove = false,
      autoProcess = false,
      note = '',
    } = req.body;

    if (!bookingId) return res.status(400).json({ message: 'Vui lòng chọn đơn đặt phòng cần bồi thường / đính chính.' });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy đơn đặt phòng.' });

    const hotel = await Hotel.findById(booking.hotelId);
    if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn của đơn đặt phòng này.' });

    // Nếu có cập nhật / đính chính thông tin khách hàng bị nhập sai trên đơn đặt phòng
    const correctedFields = [];
    if (customerCorrection && typeof customerCorrection === 'object') {
      const editableFields = [
        ['bookerFullName', 'Tên người đặt'],
        ['bookerPhone', 'SĐT người đặt'],
        ['bookerEmail', 'Email người đặt'],
        ['guestFullName', 'Tên khách lưu trú'],
        ['guestPhone', 'SĐT khách lưu trú'],
        ['specialRequests', 'Yêu cầu đặc biệt'],
      ];
      for (const [field, label] of editableFields) {
        if (customerCorrection[field] !== undefined && String(customerCorrection[field]).trim() !== String(booking[field] || '').trim()) {
          correctedFields.push(`${label}: "${booking[field] || '—'}" → "${String(customerCorrection[field]).trim()}"`);
          booking[field] = String(customerCorrection[field]).trim();
        }
      }
      if (customerCorrection.guestFullName && booking.guestFullName) {
        booking.isSelfGuest = false;
      }
      if (correctedFields.length > 0) {
        await booking.save();
      }
    }

    const amount = Number(requestedAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(booking.totalAmount || 0)) {
      return res.status(400).json({ message: 'Số tiền bồi thường không hợp lệ hoặc vượt quá tổng giá trị đơn đặt phòng.' });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do bồi thường / chi tiết sai lệch thông tin.' });
    }

    const activeExisting = await RefundRequest.findOne({
      bookingId: booking._id,
      status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSED'] },
    });
    if (activeExisting) {
      return res.status(409).json({ message: 'Đơn đặt phòng này đã có hồ sơ bồi thường đang xử lý hoặc đã hoàn tất.' });
    }

    const issuePrefix = {
      INCORRECT_CUSTOMER_INFO: '[Sai lệch thông tin khách hàng / đặt phòng]',
      INCORRECT_HOTEL_INFO: '[Thông tin khách sạn / hạng phòng không đúng mô tả]',
      SERVICE_COMPENSATION: '[Bồi thường chất lượng dịch vụ lưu trú]',
      OVERCHARGE_COMPENSATION: '[Bồi thường thu sai phụ phí]',
    }[issueType] || '[Bồi thường khách hàng]';

    const correctionNote = correctedFields.length ? ` (Đã đính chính: ${correctedFields.join('; ')})` : '';
    const fullReason = `${issuePrefix} ${reason.trim()}${correctionNote}`;

    const now = new Date();
    let initialStatus = 'REQUESTED';
    if (autoProcess) initialStatus = 'PROCESSED';
    else if (autoApprove) initialStatus = 'APPROVED';

    const refund = new RefundRequest({
      bookingId: booking._id,
      disputeId: disputeId || null,
      customerId: booking.customerId,
      hotelId: hotel._id,
      partnerId: hotel.ownerId,
      requestedAmount: amount,
      approvedAmount: (autoApprove || autoProcess) ? amount : 0,
      reason: fullReason,
      status: initialStatus,
      reviewedBy: (autoApprove || autoProcess) ? req.user._id : null,
      reviewNote: note.trim() || (correctedFields.length ? `Đã đính chính thông tin: ${correctedFields.join(', ')}` : ''),
      reviewedAt: (autoApprove || autoProcess) ? now : null,
    });

    if (autoProcess && amount > 0) {
      const payment = await Payment.create({
        bookingId: booking._id,
        txnRef: `COMP-${booking.bookingCode}-${Date.now()}`,
        type: 'REFUND',
        amount,
        status: 'SUCCESS',
        payDate: now,
      });
      refund.processedAt = now;
      refund.paymentId = payment._id;
      await Booking.updateOne({ _id: booking._id }, { paymentStatus: 'REFUNDED' });
    }

    await refund.save();

    await audit(req.user._id, `COMPENSATION_CREATED_${initialStatus}`, 'REFUND_REQUEST', refund._id, {
      bookingCode: booking.bookingCode,
      amount,
      issueType,
      correctedFields,
    });

    res.status(201).json({
      message: 'Đã khởi tạo hồ sơ bồi thường cho khách hàng thành công.',
      refund,
      correctedFields,
    });
  } catch (error) { next(error); }
};

export const getRefunds = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const result = await paged(RefundRequest, filter, req.query, [
      { path: 'bookingId', select: 'bookingCode bookerFullName bookerPhone bookerEmail guestFullName guestPhone isSelfGuest checkInDate checkOutDate totalNights totalAmount bookingStatus paymentStatus specialRequests' },
      { path: 'customerId', select: 'fullName email phoneNumber' },
      { path: 'hotelId', select: 'name address provinceCity starRating' },
      { path: 'partnerId', select: 'fullName email phoneNumber' },
      { path: 'disputeId', select: 'bookingCode category description status resolution' },
      { path: 'reviewedBy', select: 'fullName email' },
      { path: 'paymentId', select: 'txnRef amount status payDate createdAt' },
    ]);
    res.json({ refunds: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

export const reviewRefund = async (req, res, next) => {
  try {
    const { decision, approvedAmount, note = '', paymentReference = '', customerCorrection } = req.body;
    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bồi thường.' });
    if (!['UNDER_REVIEW', 'APPROVE', 'REJECT', 'MARK_PROCESSED'].includes(decision)) {
      return res.status(400).json({ message: 'Quyết định xử lý bồi thường không hợp lệ.' });
    }
    if (decision === 'REJECT' && !note.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối bồi thường.' });
    }

    const booking = await Booking.findById(refund.bookingId);
    const maxCap = booking ? Number(booking.totalAmount || refund.requestedAmount) : refund.requestedAmount;

    // Nếu OM đính chính lại thông tin khách hàng / đặt phòng ngay trong bước Thẩm định
    const correctedFields = [];
    if (booking && customerCorrection && typeof customerCorrection === 'object') {
      const editableFields = [
        ['bookerFullName', 'Tên người đặt'],
        ['bookerPhone', 'SĐT người đặt'],
        ['bookerEmail', 'Email người đặt'],
        ['guestFullName', 'Tên khách lưu trú'],
        ['guestPhone', 'SĐT khách lưu trú'],
        ['specialRequests', 'Yêu cầu đặc biệt'],
      ];
      for (const [field, label] of editableFields) {
        if (customerCorrection[field] !== undefined && String(customerCorrection[field]).trim() !== String(booking[field] || '').trim()) {
          correctedFields.push(`${label}: "${booking[field] || '—'}" → "${String(customerCorrection[field]).trim()}"`);
          booking[field] = String(customerCorrection[field]).trim();
        }
      }
      if (correctedFields.length > 0) {
        await booking.save();
      }
    }

    if (decision === 'UNDER_REVIEW') {
      refund.status = 'UNDER_REVIEW';
      if (approvedAmount !== undefined && Number.isFinite(Number(approvedAmount)) && Number(approvedAmount) >= 0) {
        refund.requestedAmount = Math.min(Number(approvedAmount), maxCap);
      }
    }

    if (decision === 'APPROVE') {
      const amount = Number(approvedAmount);
      if (!Number.isFinite(amount) || amount < 0 || amount > maxCap) {
        return res.status(400).json({ message: `Số tiền bồi thường không hợp lệ (tối đa ${maxCap.toLocaleString('vi-VN')} VND).` });
      }
      refund.status = 'APPROVED';
      refund.approvedAmount = amount;
    }

    if (decision === 'REJECT') {
      refund.status = 'REJECTED';
      refund.approvedAmount = 0;
    }

    if (decision === 'MARK_PROCESSED') {
      if (!['APPROVED', 'UNDER_REVIEW', 'REQUESTED'].includes(refund.status)) {
        return res.status(409).json({ message: 'Hồ sơ này không ở trạng thái có thể giải ngân.' });
      }
      const finalAmount = refund.approvedAmount > 0 ? refund.approvedAmount : Number(approvedAmount || refund.requestedAmount || 0);
      refund.approvedAmount = finalAmount;
      const payment = await Payment.create({
        bookingId: refund.bookingId,
        txnRef: paymentReference.trim() || `COMP-${refund._id}-${Date.now()}`,
        type: 'REFUND',
        amount: finalAmount,
        status: 'SUCCESS',
        payDate: new Date(),
      });
      refund.status = 'PROCESSED';
      refund.processedAt = new Date();
      refund.paymentId = payment._id;
      await Booking.updateOne({ _id: refund.bookingId }, { paymentStatus: 'REFUNDED' });
      await BookingCancellation.updateOne({ bookingId: refund.bookingId }, { refundStatus: 'PROCESSED' });
    }

    const extraCorrectionNote = correctedFields.length ? ` [Đính chính TT khách: ${correctedFields.join('; ')}]` : '';
    refund.reviewedBy = req.user._id;
    refund.reviewNote = `${note.trim()}${extraCorrectionNote}`.trim() || refund.reviewNote;
    refund.reviewedAt = new Date();
    await refund.save();

    await audit(req.user._id, `REFUND_${refund.status}`, 'REFUND_REQUEST', refund._id, {
      decision,
      approvedAmount: refund.approvedAmount,
      note: refund.reviewNote,
      correctedFields,
    });
    res.json({ message: 'Đã cập nhật hồ sơ bồi thường cho khách hàng.', refund, correctedFields });
  } catch (error) { next(error); }
};

export const getManagerHotels = async (req, res, next) => {
  try {
    const [hotels, activePolicies] = await Promise.all([
      Hotel.find()
        .populate('ownerId', 'fullName email phoneNumber status')
        .sort({ status: 1, name: 1 })
        .lean(),
      CommissionPolicy.find({ status: 'ACTIVE' })
        .populate('hotelId', 'name')
        .populate('partnerId', 'fullName email')
        .sort({ effectiveFrom: -1 })
        .lean(),
    ]);

    const scopePriority = { HOTEL: 3, PARTNER: 2, GLOBAL: 1 };
    const enrichedHotels = hotels.map((hotel) => {
      const ownerIdStr = String(hotel.ownerId?._id || hotel.ownerId || '');
      const matchingPolicies = activePolicies.filter((p) => {
        if (p.scope === 'HOTEL') return String(p.hotelId?._id || p.hotelId) === String(hotel._id);
        if (p.scope === 'PARTNER') return String(p.partnerId?._id || p.partnerId) === ownerIdStr;
        return p.scope === 'GLOBAL';
      });
      matchingPolicies.sort((a, b) => scopePriority[b.scope] - scopePriority[a.scope]);
      const effectivePolicy = matchingPolicies[0] || null;
      const directPolicy = matchingPolicies.find((p) => p.scope === 'HOTEL') || null;
      return {
        ...hotel,
        effectivePolicy,
        directPolicy,
      };
    });

    res.json({ hotels: enrichedHotels });
  } catch (error) { next(error); }
};

export const getCommissionPolicies = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const policies = await CommissionPolicy.find(filter)
      .populate('partnerId', 'fullName email phoneNumber')
      .populate('hotelId', 'name provinceCity address starRating status ownerId')
      .populate('createdBy', 'fullName email')
      .sort({ status: 1, effectiveFrom: -1, createdAt: -1 });
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
    const { name, calculationType, value, scope = 'HOTEL', partnerId, hotelId, effectiveFrom, effectiveTo } = req.body;
    const numericValue = Number(value);
    if (!name?.trim() || !['PERCENTAGE', 'FIXED'].includes(calculationType) || !Number.isFinite(numericValue) || numericValue < 0 || (calculationType === 'PERCENTAGE' && numericValue > 100)) {
      return res.status(400).json({ message: 'Thông tin chính sách hoa hồng không hợp lệ.' });
    }
    if (!effectiveFrom || Number.isNaN(new Date(effectiveFrom).getTime())) {
      return res.status(400).json({ message: 'Ngày bắt đầu hiệu lực không hợp lệ.' });
    }
    if (effectiveTo && (Number.isNaN(new Date(effectiveTo).getTime()) || new Date(effectiveTo) < new Date(effectiveFrom))) {
      return res.status(400).json({ message: 'Ngày kết thúc hiệu lực phải sau ngày bắt đầu.' });
    }
    if (scope === 'HOTEL' && !hotelId) {
      return res.status(400).json({ message: 'Vui lòng chọn khách sạn để gắn chính sách hoa hồng.' });
    }
    if (scope === 'PARTNER' && !partnerId) {
      return res.status(400).json({ message: 'Vui lòng chọn đối tác áp dụng chính sách hoa hồng.' });
    }

    let resolvedPartnerId = partnerId || null;
    let targetHotel = null;
    if (scope === 'HOTEL') {
      targetHotel = await Hotel.findById(hotelId);
      if (!targetHotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn được chọn.' });
      resolvedPartnerId = targetHotel.ownerId;
    }

    // Tự động ngừng áp dụng chính sách ACTIVE cũ của cùng khách sạn / cùng đối tác / cùng toàn hệ thống để tránh chồng chéo
    const conflictFilter = { status: 'ACTIVE', scope };
    if (scope === 'HOTEL') conflictFilter.hotelId = targetHotel._id;
    else if (scope === 'PARTNER') conflictFilter.partnerId = resolvedPartnerId;
    await CommissionPolicy.updateMany(conflictFilter, { $set: { status: 'INACTIVE' } });

    const policy = await CommissionPolicy.create({
      name: name.trim(),
      calculationType,
      value: numericValue,
      scope,
      partnerId: scope === 'GLOBAL' ? null : resolvedPartnerId,
      hotelId: scope === 'HOTEL' ? targetHotel._id : null,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      status: 'ACTIVE',
      createdBy: req.user._id,
    });

    await audit(req.user._id, 'COMMISSION_POLICY_CREATED', 'COMMISSION_POLICY', policy._id, {
      scope,
      hotelId: targetHotel?._id || null,
      hotelName: targetHotel?.name || null,
      calculationType,
      value: numericValue,
    });

    const populated = await CommissionPolicy.findById(policy._id)
      .populate('partnerId', 'fullName email phoneNumber')
      .populate('hotelId', 'name provinceCity address starRating status ownerId')
      .populate('createdBy', 'fullName email');

    res.status(201).json({ message: 'Đã tạo và gắn chính sách hoa hồng thành công.', policy: populated });
  } catch (error) { next(error); }
};

export const updateCommissionPolicy = async (req, res, next) => {
  try {
    const policy = await CommissionPolicy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Không tìm thấy chính sách hoa hồng.' });

    const { name, calculationType, value, scope, hotelId, partnerId, effectiveFrom, effectiveTo, status } = req.body;
    if (name !== undefined) policy.name = name.trim();
    if (calculationType !== undefined) policy.calculationType = calculationType;
    if (value !== undefined) policy.value = Number(value);
    if (effectiveFrom !== undefined) policy.effectiveFrom = effectiveFrom;
    if (effectiveTo !== undefined) policy.effectiveTo = effectiveTo || null;
    if (status !== undefined) policy.status = status;

    if (scope !== undefined) {
      policy.scope = scope;
      if (scope === 'GLOBAL') {
        policy.hotelId = null;
        policy.partnerId = null;
      }
    }

    if (policy.scope === 'HOTEL' && hotelId !== undefined) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) return res.status(404).json({ message: 'Không tìm thấy khách sạn được chọn.' });
      policy.hotelId = hotel._id;
      policy.partnerId = hotel.ownerId;
    } else if (policy.scope === 'PARTNER' && partnerId !== undefined) {
      policy.partnerId = partnerId;
      policy.hotelId = null;
    }

    if (policy.calculationType === 'PERCENTAGE' && Number(policy.value) > 100) {
      return res.status(400).json({ message: 'Hoa hồng phần trăm không thể vượt quá 100%.' });
    }
    if (policy.scope === 'HOTEL' && !policy.hotelId) {
      return res.status(400).json({ message: 'Chính sách phạm vi Khách sạn bắt buộc phải gắn với một khách sạn.' });
    }

    // Nếu chính sách đang ACTIVE, tắt các chính sách ACTIVE trùng phạm vi khách sạn/đối tác
    if (policy.status === 'ACTIVE') {
      const conflictFilter = { _id: { $ne: policy._id }, status: 'ACTIVE', scope: policy.scope };
      if (policy.scope === 'HOTEL') conflictFilter.hotelId = policy.hotelId;
      else if (policy.scope === 'PARTNER') conflictFilter.partnerId = policy.partnerId;
      await CommissionPolicy.updateMany(conflictFilter, { $set: { status: 'INACTIVE' } });
    }

    await policy.save();
    await audit(req.user._id, 'COMMISSION_POLICY_UPDATED', 'COMMISSION_POLICY', policy._id, {
      scope: policy.scope,
      hotelId: policy.hotelId,
      status: policy.status,
      value: policy.value,
    });

    const populated = await CommissionPolicy.findById(policy._id)
      .populate('partnerId', 'fullName email phoneNumber')
      .populate('hotelId', 'name provinceCity address starRating status ownerId')
      .populate('createdBy', 'fullName email');

    res.json({ message: 'Đã cập nhật chính sách hoa hồng.', policy: populated });
  } catch (error) { next(error); }
};

export const getPayouts = async (req, res, next) => {
  try {
    const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.partnerId) filter.partnerId = req.query.partnerId;
    const result = await paged(Payout, filter, req.query, [{ path: 'partnerId', select: 'fullName email' }, { path: 'policyId', select: 'name calculationType value scope hotelId' }, { path: 'reviewedBy', select: 'fullName email' }]);
    res.json({ payouts: result.items, pagination: result.pagination });
  } catch (error) { next(error); }
};

// Ngày dạng YYYY-MM-DD từ form được hiểu theo giờ Việt Nam để kỳ thanh toán tính đủ cả ngày cuối
const toPeriodBound = (value, time) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${time}+07:00` : value);

export const generatePayout = async (req, res, next) => {
  try {
    const { partnerId, periodStart, periodEnd } = req.body;
    const start = toPeriodBound(periodStart, '00:00:00'); const end = toPeriodBound(periodEnd, '23:59:59.999');
    if (!partnerId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return res.status(400).json({ message: 'Partner hoặc kỳ thanh toán không hợp lệ.' });
    const partner = await User.findOne({ _id: partnerId, role: 'HOTEL_PARTNER' });
    if (!partner) return res.status(404).json({ message: 'Không tìm thấy đối tác khách sạn.' });
    const hotelIds = (await Hotel.find({ ownerId: partnerId }).select('_id')).map((hotel) => hotel._id.toString());
    // Cùng quy tắc doanh thu với màn Thống kê của đối tác: đơn đã qua ngày trả phòng tính vào kỳ của ngày trả phòng,
    // đơn hủy chỉ tính phí giữ lại và tính vào kỳ của ngày hủy
    const paidStatuses = ['PAID', 'REFUNDED'];
    const completed = await Booking.find({
      hotelId: { $in: hotelIds },
      paymentStatus: { $in: paidStatuses },
      checkOutDate: { $gte: start, $lte: end },
      $or: [{ bookingStatus: 'COMPLETED' }, { bookingStatus: 'CONFIRMED', checkOutDate: { $lt: new Date() } }],
    });
    const cancellations = (await BookingCancellation.find({ cancelledAt: { $gte: start, $lte: end }, cancellationFee: { $gt: 0 } }).populate('bookingId'))
      .filter(({ bookingId: booking }) => booking && hotelIds.includes(String(booking.hotelId)) && paidStatuses.includes(booking.paymentStatus));
    const completedIds = completed.map((booking) => booking._id);
    const bookingIds = [...completedIds, ...cancellations.map((item) => item.bookingId._id)];
    const [refunds, openDisputes, openRefunds] = await Promise.all([
      // Tiền hoàn lúc hủy đã nằm ngoài phí giữ lại nên chỉ trừ khoản hoàn của đơn hoàn thành
      RefundRequest.find({ bookingId: { $in: completedIds }, status: 'PROCESSED' }),
      Dispute.find({ bookingId: { $in: bookingIds }, status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] } }),
      RefundRequest.find({ bookingId: { $in: bookingIds }, status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED'] } }),
    ]);
    const revenueItems = [
      ...completed.map((booking) => ({ booking, revenue: Number(booking.totalAmount || 0) })),
      ...cancellations.map((item) => ({ booking: item.bookingId, revenue: Number(item.cancellationFee) })),
    ];
    const grossRevenue = revenueItems.reduce((sum, item) => sum + item.revenue, 0);
    const refundAdjustment = refunds.reduce((sum, refund) => sum + Number(refund.approvedAmount || 0), 0);
    const refundedOf = (booking) => refunds.filter((refund) => refund.bookingId.equals(booking._id)).reduce((sum, refund) => sum + Number(refund.approvedAmount || 0), 0);
    const scopePriority = { HOTEL: 3, PARTNER: 2, GLOBAL: 1 };
    const commissionBreakdown = await Promise.all(revenueItems.map(async ({ booking, revenue: itemRevenue }) => {
      const bookedAt = booking.createdAt || start;
      const candidatePolicies = await CommissionPolicy.find({
        status: 'ACTIVE',
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

      // Ưu tiên chính sách có effectiveFrom <= bookedAt; nếu chính sách mới gắn cho khách sạn sau ngày đặt đơn thì vẫn áp dụng theo thứ tự HOTEL > PARTNER > GLOBAL
      const strictMatches = candidatePolicies.filter((p) => new Date(p.effectiveFrom) <= new Date(bookedAt));
      const pool = strictMatches.length > 0 ? strictMatches : candidatePolicies;
      const policy = pool.sort((left, right) => scopePriority[right.scope] - scopePriority[left.scope])[0];

      // Hoa hồng tính trên số tiền còn lại sau khi hoàn cho khách, không vượt quá số tiền đó
      const revenue = Math.max(0, itemRevenue - refundedOf(booking));
      const amount = policy
        ? (policy.calculationType === 'PERCENTAGE' ? Math.round((revenue * policy.value) / 100) : Math.min(Number(policy.value), revenue))
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
      holdReason: holdCount ? `Có ${holdCount} tranh chấp hoặc hồ sơ bồi thường đang mở.` : '',
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
