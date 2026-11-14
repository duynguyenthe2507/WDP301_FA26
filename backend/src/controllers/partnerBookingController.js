import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import BookingCancellation from '../models/BookingCancellation.js';
import BookingDetail from '../models/BookingDetail.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { calculateCancellationDetails } from './customerController.js';
import { findApprovedHotel, notApproved } from './partnerController.js';
import { effectiveStatus, endOfDay, isValidDay, PAID_FILTER, rangeError, startOfDay, vnDate } from './partnerStatisticsController.js';

const PAGE_SIZE = 10;
const ACK_ACTION = 'BOOKING_ACKNOWLEDGED';
const PARTNER_CANCEL_ACTION = 'BOOKING_CANCELLED_BY_PARTNER';
// Hạn xác nhận đơn mới tính từ lúc đặt (BR-62, giá trị chờ nhóm chốt)
const ACK_DEADLINE_MS = 24 * 60 * 60 * 1000;
const STATUS_FILTERS = {
  // Đơn mới: đã xác nhận, chưa qua ngày trả phòng và khách sạn chưa bấm Xác nhận đã nhận
  NEW: (now, acknowledgedIds) => ({ bookingStatus: 'CONFIRMED', checkOutDate: { $gte: now }, _id: { $nin: acknowledgedIds } }),
  CONFIRMED: (now) => ({ bookingStatus: 'CONFIRMED', checkOutDate: { $gte: now } }),
  COMPLETED: (now) => ({ $or: [{ bookingStatus: 'COMPLETED' }, { bookingStatus: 'CONFIRMED', checkOutDate: { $lt: now } }] }),
  CANCELLED: () => ({ bookingStatus: 'CANCELLED' }),
};
const SORTS = {
  // Đơn sắp nhận phòng trước (gần nhất trước), rồi đến đơn đã qua (mới nhất trước)
  checkIn: { isPast: 1, checkInOrder: 1 },
  bookedAt: { createdAt: -1 },
  amount: { totalAmount: -1 },
};
// Hai trường hợp partner hủy: khách nhờ hủy hộ (hoàn theo chính sách) hoặc khách sạn gặp sự cố (hoàn 100%, BR-53)
export const CANCEL_REASONS = {
  CUSTOMER: [
    'Thay đổi lịch trình',
    'Tìm được giá tốt hơn hoặc nơi ở khác',
    'Lý do cá nhân / Sức khỏe',
    'Thời tiết xấu hoặc sự cố phương tiện di chuyển',
    'Kế hoạch chuyến đi bị hủy bỏ',
    'Lý do khác',
  ],
  HOTEL: [
    'Hết phòng / nhận trùng đơn',
    'Phòng hư hỏng cần sửa chữa',
    'Khách sạn tạm ngừng hoạt động',
    'Sự cố bất khả kháng',
    'Lý do khác',
  ],
};
const REASON_PREFIX = { CUSTOMER: 'Hủy theo yêu cầu của khách', HOTEL: 'Khách sạn hủy' };
const MSG_NOT_CONFIRMED = 'Không thể hủy đặt phòng này vì đặt phòng không ở trạng thái Đã xác nhận.'; // MSG10
const MSG_MISSING_REASON = 'Vui lòng chọn lý do và nhập ghi chú.'; // MSG17

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const guestNameOf = (booking) => (!booking.isSelfGuest && booking.guestFullName) || booking.bookerFullName;
const notFound = (res) => res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });

// Việc xác nhận đã nhận và việc partner hủy được lưu trong AuditLog vì Booking không có trường riêng
const loadAcknowledgements = (bookingIds) =>
  AuditLog.find({ action: ACK_ACTION, entityType: 'BOOKING', entityId: { $in: bookingIds } }).sort({ createdAt: 1 }).lean();
const isNewBooking = (booking, status, acknowledged) => status === 'CONFIRMED' && !acknowledged;
const isAckOverdue = (booking, now) => now - new Date(booking.createdAt) > ACK_DEADLINE_MS;
// Chỉ hủy được đơn đã thanh toán, đang Đã xác nhận và chưa qua ngày nhận phòng (giờ Việt Nam)
const canCancel = (booking, status, now) =>
  status === 'CONFIRMED' && booking.paymentStatus === 'PAID' && vnDate(booking.checkInDate) >= vnDate(now);
const findOwnedBooking = (hotel, id) =>
  Booking.findOne({ _id: id, hotelId: hotel._id, ...PAID_FILTER, bookingStatus: { $ne: 'PENDING_PAYMENT' } }).lean();

export const getPartnerBookings = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { status, from, to, sort = 'checkIn' } = req.query;
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    if ((from && !isValidDay(from)) || (to && !isValidDay(to)) || (from && to && rangeError(from, to))) {
      return res.status(400).json({ message: rangeError(from || to, to || from) || rangeError(from, to) });
    }
    if (status && !Object.hasOwn(STATUS_FILTERS, status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    if (!Object.hasOwn(SORTS, sort)) return res.status(400).json({ message: 'Cách sắp xếp không hợp lệ.' });

    const now = new Date();
    const acknowledgedIds = status === 'NEW'
      ? await AuditLog.distinct('entityId', { action: ACK_ACTION, entityType: 'BOOKING', 'metadata.hotelId': hotel._id })
      : [];
    // Khách bắt buộc trả tiền khi đặt nên partner chỉ thấy đơn đã thanh toán
    const conditions = [{ hotelId: hotel._id, ...PAID_FILTER, bookingStatus: { $ne: 'PENDING_PAYMENT' } }];
    if (status) conditions.push(STATUS_FILTERS[status](now, acknowledgedIds));
    if (from) conditions.push({ checkInDate: { $gte: startOfDay(from) } });
    if (to) conditions.push({ checkInDate: { $lte: endOfDay(to) } });
    if (search.trim()) {
      const keyword = new RegExp(escapeRegex(search.trim()), 'i');
      conditions.push({ $or: [{ bookingCode: keyword }, { bookerFullName: keyword }, { guestFullName: keyword }] });
    }
    const filter = { $and: conditions };

    const total = await Booking.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, Number(req.query.page) || 1), totalPages);
    const today = startOfDay(vnDate(now));
    const bookings = await Booking.aggregate([
      { $match: filter },
      { $addFields: {
        isPast: { $lt: ['$checkInDate', today] },
        checkInOrder: { $cond: [{ $lt: ['$checkInDate', today] }, { $multiply: [{ $toLong: '$checkInDate' }, -1] }, { $toLong: '$checkInDate' }] },
      } },
      { $sort: { ...SORTS[sort], _id: 1 } },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
    ]);
    const bookingIds = bookings.map((booking) => booking._id);
    const [details, acknowledgements] = await Promise.all([
      BookingDetail.find({ bookingId: { $in: bookingIds } }).lean(),
      loadAcknowledgements(bookingIds),
    ]);
    const linesOf = (booking) => details.filter((detail) => detail.bookingId.equals(booking._id));
    const isAcknowledged = (booking) => acknowledgements.some((log) => log.entityId.equals(booking._id));

    res.json({
      // Danh sách không có số điện thoại, email của khách (BR-49); chỉ xem được ở chi tiết đơn
      bookings: bookings.map((booking) => {
        const bookingStatus = effectiveStatus(booking, now);
        const isNew = isNewBooking(booking, bookingStatus, isAcknowledged(booking));
        return {
          _id: booking._id,
          bookingCode: booking.bookingCode,
          guestName: guestNameOf(booking),
          roomTypeName: linesOf(booking).map((line) => line.roomTypeName).join(', '),
          quantity: linesOf(booking).reduce((sum, line) => sum + line.quantity, 0),
          checkInDate: vnDate(booking.checkInDate),
          checkOutDate: vnDate(booking.checkOutDate),
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
          bookingStatus,
          isNew,
          ackOverdue: isNew && isAckOverdue(booking, now),
        };
      }),
      pagination: { page, totalPages, total },
    });
  } catch (error) { next(error); }
};

export const getPartnerBooking = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const booking = await findOwnedBooking(hotel, req.params.id);
    if (!booking) return notFound(res);

    const [lines, payment, cancellation, acknowledgements, partnerCancel] = await Promise.all([
      BookingDetail.find({ bookingId: booking._id }).lean(),
      Payment.findOne({ bookingId: booking._id, type: 'PAYMENT', status: 'SUCCESS' }).sort({ createdAt: -1 }).lean(),
      BookingCancellation.findOne({ bookingId: booking._id }).lean(),
      loadAcknowledgements([booking._id]),
      AuditLog.findOne({ action: PARTNER_CANCEL_ACTION, entityType: 'BOOKING', entityId: booking._id }).lean(),
    ]);
    const acknowledgement = acknowledgements[0];
    const actorIds = [acknowledgement?.admin_id, partnerCancel?.admin_id].filter(Boolean);
    const actors = actorIds.length ? await User.find({ _id: { $in: actorIds } }).select('fullName').lean() : [];
    const actorName = (id) => actors.find((user) => user._id.equals(id))?.fullName || 'Khách sạn';

    const now = new Date();
    const status = effectiveStatus(booking, now);
    const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const isNew = isNewBooking(booking, status, acknowledgement);
    const cancellable = canCancel(booking, status, now);

    // Model không lưu lịch sử trạng thái nên dựng lại từ các mốc thời gian và AuditLog
    const history = [{ status: 'CONFIRMED', at: payment?.payDate || booking.createdAt, note: 'Khách thanh toán thành công' }];
    if (acknowledgement) history.push({ status: 'CONFIRMED', event: 'ACKNOWLEDGED', at: acknowledgement.createdAt, note: `Xác nhận bởi ${actorName(acknowledgement.admin_id)}` });
    if (status === 'COMPLETED') history.push({ status: 'COMPLETED', at: booking.checkOutDate, note: 'Đã qua ngày trả phòng' });
    if (status === 'CANCELLED') {
      const by = partnerCancel ? `Hủy bởi ${actorName(partnerCancel.admin_id)}` : 'Khách tự hủy';
      history.push({ status: 'CANCELLED', at: cancellation?.cancelledAt || booking.updatedAt, note: [by, cancellation?.reason].filter(Boolean).join(' · ') });
    }

    let cancelOptions = null;
    if (cancellable) {
      const policyRefund = calculateCancellationDetails(booking, hotel);
      cancelOptions = {
        reasons: CANCEL_REASONS,
        paidAmount: booking.totalAmount,
        // Số tiền nếu hủy ngay bây giờ theo yêu cầu của khách; hủy do khách sạn luôn hoàn đủ
        policyRefund: { refundAmount: policyRefund.refundAmount, cancellationFee: policyRefund.cancellationFee, description: policyRefund.policyDescription },
      };
    }

    res.json({
      booking: {
        _id: booking._id,
        bookingCode: booking.bookingCode,
        bookingStatus: status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        bookerFullName: booking.bookerFullName,
        bookerPhone: booking.bookerPhone,
        bookerEmail: booking.bookerEmail,
        isSelfGuest: booking.isSelfGuest,
        guestFullName: booking.guestFullName,
        guestPhone: booking.guestPhone,
        adultsCount: booking.adultsCount,
        childrenCount: booking.childrenCount,
        specialRequests: booking.specialRequests,
        checkInDate: vnDate(booking.checkInDate),
        checkOutDate: vnDate(booking.checkOutDate),
        totalNights: booking.totalNights,
        lines: lines.map(({ _id, roomTypeName, quantity, pricePerNight, totalPrice }) => ({ _id, roomTypeName, quantity, pricePerNight, totalPrice })),
        subtotal,
        taxAndFees: Math.max(0, booking.totalAmount - subtotal),
        totalAmount: booking.totalAmount,
        // Đơn cũ chưa lưu chính sách lúc đặt thì dùng chính sách hiện tại của khách sạn
        cancellationPolicy: booking.cancellationPolicy || hotel.cancellationPolicy,
        paidAt: payment?.payDate || null,
        isNew,
        ackOverdue: isNew && isAckOverdue(booking, now),
        acknowledgedAt: acknowledgement?.createdAt || null,
        canCancel: cancellable,
        cancelOptions,
        cancellation: cancellation && {
          reason: cancellation.reason,
          note: cancellation.note,
          cancelledAt: cancellation.cancelledAt,
          cancellationFee: cancellation.cancellationFee,
          refundAmount: cancellation.refundAmount,
          refundStatus: cancellation.refundStatus,
          cancelledBy: partnerCancel ? 'PARTNER' : 'CUSTOMER',
        },
        history,
      },
    });
  } catch (error) { next(error); }
};

// Receive Booking (2.4.6): chỉ ghi nhận khách sạn đã nhận đơn, không đổi trạng thái đơn hay thanh toán (BR-62)
export const acknowledgeBooking = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const booking = await findOwnedBooking(hotel, req.params.id);
    if (!booking) return notFound(res);
    if (effectiveStatus(booking, new Date()) !== 'CONFIRMED') {
      return res.status(409).json({ message: 'Đặt phòng không còn ở trạng thái Đã xác nhận nên không thể xác nhận nhận đơn.' });
    }

    // upsert theo đơn để bấm hai lần (hoặc hai tab) cũng chỉ có một bản ghi
    await AuditLog.updateOne(
      { action: ACK_ACTION, entityType: 'BOOKING', entityId: booking._id },
      { $setOnInsert: { admin_id: req.user._id, target_user_id: booking.customerId, metadata: { bookingCode: booking.bookingCode, hotelId: hotel._id } } },
      { upsert: true },
    );
    res.json({ message: `Đã xác nhận nhận đặt phòng ${booking.bookingCode}.` }); // MSG15
  } catch (error) { next(error); }
};

// Cancel Booking (Hotel Partner) (2.4.7)
export const cancelPartnerBooking = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const { initiator, reason, note } = req.body || {};
    const waiveFee = req.body?.waiveFee === true;
    if (typeof initiator !== 'string' || !Object.hasOwn(CANCEL_REASONS, initiator)) return res.status(400).json({ message: 'Vui lòng chọn ai muốn hủy đặt phòng.' });
    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    const cleanNote = typeof note === 'string' ? note.trim() : '';
    if (!cleanReason || !cleanNote) return res.status(400).json({ message: MSG_MISSING_REASON });
    if (!CANCEL_REASONS[initiator].includes(cleanReason)) return res.status(400).json({ message: 'Lý do hủy không hợp lệ.' });
    if (cleanNote.length > 1000) return res.status(400).json({ message: 'Ghi chú tối đa 1000 ký tự.' });

    const booking = await findOwnedBooking(hotel, req.params.id);
    if (!booking) return notFound(res);
    const now = new Date();
    if (!canCancel(booking, effectiveStatus(booking, now), now)) return res.status(409).json({ message: MSG_NOT_CONFIRMED });

    const totalAmount = Number(booking.totalAmount) || 0;
    let refundAmount = totalAmount;
    if (initiator === 'CUSTOMER' && !waiveFee) refundAmount = calculateCancellationDetails(booking, hotel).refundAmount;
    const cancellationFee = totalAmount - refundAmount;

    // Đổi trạng thái có điều kiện để không hủy chồng lên đơn khách vừa tự hủy (Exc 3)
    const updated = await Booking.updateOne(
      { _id: booking._id, hotelId: hotel._id, bookingStatus: 'CONFIRMED', paymentStatus: 'PAID' },
      { $set: { bookingStatus: 'CANCELLED' } },
    );
    if (!updated.modifiedCount) return res.status(409).json({ message: MSG_NOT_CONFIRMED });

    // Hoàn tiền được mô phỏng: hủy xong là coi như đã hoàn, ghi một giao dịch REFUND để lưu vết.
    // paymentStatus giữ PAID vì màn của khách dựa vào đó để hiện phần hoàn tiền.
    let cancellationId = null;
    try {
      const cancellation = await BookingCancellation.create({
        bookingId: booking._id,
        reason: `${REASON_PREFIX[initiator]}: ${cleanReason}`,
        note: cleanNote,
        cancelledAt: now,
        cancellationFee,
        refundAmount,
        refundStatus: refundAmount > 0 ? 'PROCESSED' : 'NOT_APPLICABLE',
      });
      cancellationId = cancellation._id;
      if (refundAmount > 0) {
        await Payment.create({
          bookingId: booking._id,
          amount: refundAmount,
          type: 'REFUND',
          status: 'SUCCESS',
          txnRef: `REF-${booking.bookingCode}-${now.getTime()}`,
          payDate: now,
        });
      }
    } catch (error) {
      if (cancellationId) await BookingCancellation.deleteOne({ _id: cancellationId });
      await Booking.updateOne({ _id: booking._id, bookingStatus: 'CANCELLED' }, { $set: { bookingStatus: 'CONFIRMED' } });
      throw error;
    }

    // Lịch sử hủy và để Operations Manager xem lại các đơn do khách sạn hủy (BR-53, BR-54)
    await AuditLog.create({
      admin_id: req.user._id,
      target_user_id: booking.customerId,
      action: PARTNER_CANCEL_ACTION,
      entityType: 'BOOKING',
      entityId: booking._id,
      old_status: 'CONFIRMED',
      new_status: 'CANCELLED',
      new_reason: cleanReason,
      metadata: { bookingCode: booking.bookingCode, hotelId: hotel._id, initiator, note: cleanNote, waiveFee, refundAmount, cancellationFee },
    });

    res.json({ message: `Đã hủy đặt phòng ${booking.bookingCode}. Khách hàng sẽ được thông báo.`, refundAmount, cancellationFee }); // MSG16
  } catch (error) { next(error); }
};
