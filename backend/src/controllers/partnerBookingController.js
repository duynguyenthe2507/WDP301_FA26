import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingCancellation from '../models/BookingCancellation.js';
import BookingDetail from '../models/BookingDetail.js';
import Payment from '../models/Payment.js';
import { findApprovedHotel, notApproved } from './partnerController.js';
import { effectiveStatus, endOfDay, isValidDay, PAID_FILTER, rangeError, startOfDay, vnDate } from './partnerStatisticsController.js';

const PAGE_SIZE = 10;
const STATUS_FILTERS = {
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
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const guestNameOf = (booking) => (!booking.isSelfGuest && booking.guestFullName) || booking.bookerFullName;

export const getPartnerBookings = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { search = '', status, from, to, sort = 'checkIn' } = req.query;
    if ((from && !isValidDay(from)) || (to && !isValidDay(to)) || (from && to && rangeError(from, to))) {
      return res.status(400).json({ message: rangeError(from || to, to || from) || rangeError(from, to) });
    }
    if (status && !STATUS_FILTERS[status]) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    if (!SORTS[sort]) return res.status(400).json({ message: 'Cách sắp xếp không hợp lệ.' });

    const now = new Date();
    // Khách bắt buộc trả tiền khi đặt nên partner chỉ thấy đơn đã thanh toán
    const conditions = [{ hotelId: hotel._id, ...PAID_FILTER, bookingStatus: { $ne: 'PENDING_PAYMENT' } }];
    if (status) conditions.push(STATUS_FILTERS[status](now));
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
    const details = await BookingDetail.find({ bookingId: { $in: bookings.map((booking) => booking._id) } }).lean();
    const linesOf = (booking) => details.filter((detail) => detail.bookingId.equals(booking._id));

    res.json({
      // Danh sách không có số điện thoại, email của khách (BR-49); chỉ xem được ở chi tiết đơn
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        bookingCode: booking.bookingCode,
        guestName: guestNameOf(booking),
        roomTypeName: linesOf(booking).map((line) => line.roomTypeName).join(', '),
        quantity: linesOf(booking).reduce((sum, line) => sum + line.quantity, 0),
        checkInDate: vnDate(booking.checkInDate),
        checkOutDate: vnDate(booking.checkOutDate),
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        bookingStatus: effectiveStatus(booking, now),
      })),
      pagination: { page, totalPages, total },
    });
  } catch (error) { next(error); }
};

export const getPartnerBooking = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const notFound = () => res.status(404).json({ message: 'Không tìm thấy đặt phòng.' });
    if (!mongoose.isValidObjectId(req.params.id)) return notFound();
    const booking = await Booking.findOne({ _id: req.params.id, hotelId: hotel._id, ...PAID_FILTER, bookingStatus: { $ne: 'PENDING_PAYMENT' } }).lean();
    if (!booking) return notFound();

    const [lines, payment, cancellation] = await Promise.all([
      BookingDetail.find({ bookingId: booking._id }).lean(),
      Payment.findOne({ bookingId: booking._id, type: 'PAYMENT', status: 'SUCCESS' }).sort({ createdAt: -1 }).lean(),
      BookingCancellation.findOne({ bookingId: booking._id }).lean(),
    ]);
    const now = new Date();
    const status = effectiveStatus(booking, now);
    const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);

    // Model không lưu lịch sử trạng thái nên dựng lại từ các mốc thời gian đang có
    const history = [{ status: 'CONFIRMED', at: payment?.payDate || booking.createdAt, note: 'Khách thanh toán thành công' }];
    if (status === 'COMPLETED') history.push({ status: 'COMPLETED', at: booking.checkOutDate, note: 'Đã qua ngày trả phòng' });
    if (status === 'CANCELLED') history.push({ status: 'CANCELLED', at: cancellation?.cancelledAt || booking.updatedAt, note: cancellation?.reason || '' });

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
        cancellation: cancellation && {
          reason: cancellation.reason,
          note: cancellation.note,
          cancelledAt: cancellation.cancelledAt,
          cancellationFee: cancellation.cancellationFee,
          refundAmount: cancellation.refundAmount,
          refundStatus: cancellation.refundStatus,
        },
        history,
      },
    });
  } catch (error) { next(error); }
};
