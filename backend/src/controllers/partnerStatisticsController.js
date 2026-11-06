import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import BookingCancellation from '../models/BookingCancellation.js';
import BookingDetail from '../models/BookingDetail.js';
import CommissionPolicy from '../models/CommissionPolicy.js';
import Payout from '../models/Payout.js';
import RefundRequest from '../models/RefundRequest.js';
import RoomType from '../models/RoomType.js';
import { findApprovedHotel, notApproved } from './partnerController.js';

const MAX_RANGE_DAYS = 366;
const MAX_REPORT_LINES = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NO_DATA_MESSAGE = 'Không có dữ liệu thống kê trong khoảng thời gian đã chọn.';

// Khách bắt buộc trả tiền khi đặt nên partner chỉ thống kê đơn đã thanh toán
export const PAID_FILTER = { paymentStatus: { $in: ['PAID', 'REFUNDED'] } };

// Kỳ thống kê tính theo giờ Việt Nam, ngày ở dạng YYYY-MM-DD
export const vnDate = (date) => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
export const startOfDay = (day) => new Date(`${day}T00:00:00+07:00`);
export const endOfDay = (day) => new Date(`${day}T23:59:59.999+07:00`);
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
const addDays = (day, days) => new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10);
const sumBy = (items, read) => items.reduce((total, item) => total + read(item), 0);

export const isValidDay = (day) => DATE_PATTERN.test(day || '') && !Number.isNaN(Date.parse(day));
export const rangeError = (from, to) => {
  if (isValidDay(from) && isValidDay(to) && to >= from && daysBetween(from, to) <= MAX_RANGE_DAYS) return null;
  return `Khoảng thời gian không hợp lệ. Ngày kết thúc phải sau ngày bắt đầu và không vượt quá ${MAX_RANGE_DAYS} ngày.`;
};

// Chưa có luồng nào chuyển đơn sang COMPLETED nên đơn CONFIRMED đã qua ngày trả phòng cũng là đã hoàn thành,
// giống cách lịch sử đặt phòng của khách đang xử lý
const isCompleted = (booking, now) =>
  booking.bookingStatus === 'COMPLETED' || (booking.bookingStatus === 'CONFIRMED' && booking.checkOutDate < now);
export const effectiveStatus = (booking, now) => (isCompleted(booking, now) ? 'COMPLETED' : booking.bookingStatus);
const guestsOf = (booking) => (booking.adultsCount || 0) + (booking.childrenCount || 0);

// Chọn chính sách hoa hồng đang hiệu lực lúc đặt phòng, cùng thứ tự ưu tiên với generatePayout
const SCOPE_PRIORITY = { HOTEL: 3, PARTNER: 2, GLOBAL: 1 };
const loadCommissionPolicies = (partnerId, hotelId) =>
  CommissionPolicy.find({
    status: 'ACTIVE',
    $or: [{ scope: 'GLOBAL' }, { scope: 'PARTNER', partnerId }, { scope: 'HOTEL', hotelId }],
  }).sort({ effectiveFrom: -1 }).lean();
const commissionFor = (policies, bookedAt, revenue) => {
  const policy = policies
    .filter((item) => item.effectiveFrom <= bookedAt && (!item.effectiveTo || item.effectiveTo >= bookedAt))
    .sort((left, right) => SCOPE_PRIORITY[right.scope] - SCOPE_PRIORITY[left.scope])[0];
  if (!policy) return 0;
  return policy.calculationType === 'PERCENTAGE' ? Math.round((revenue * policy.value) / 100) : Math.min(policy.value, revenue);
};

// Doanh thu theo từng đơn: đơn hoàn thành ghi nhận vào ngày trả phòng (trừ tiền đã hoàn sau tranh chấp),
// đơn hủy chỉ tính phần phí giữ lại và ghi nhận vào ngày hủy (BR-55)
const loadRevenueEntries = async (hotel, from, to) => {
  const now = new Date();
  const start = startOfDay(from);
  const end = endOfDay(to);
  const [completed, cancellations, policies] = await Promise.all([
    Booking.find({
      hotelId: hotel._id,
      ...PAID_FILTER,
      checkOutDate: { $gte: start, $lte: end },
      $or: [{ bookingStatus: 'COMPLETED' }, { bookingStatus: 'CONFIRMED', checkOutDate: { $gte: start, $lte: end, $lt: now } }],
    }).lean(),
    BookingCancellation.find({ cancelledAt: { $gte: start, $lte: end } }).populate('bookingId').lean(),
    loadCommissionPolicies(hotel.ownerId, hotel._id),
  ]);
  const refunds = await RefundRequest.find({ hotelId: hotel._id, status: 'PROCESSED', bookingId: { $in: completed.map((booking) => booking._id) } }).lean();
  const refundedOf = (booking) => sumBy(refunds.filter((refund) => refund.bookingId.equals(booking._id)), (refund) => refund.approvedAmount || 0);
  const toEntry = (booking, gross, recognizedAt, status) => {
    const commission = commissionFor(policies, booking.createdAt, gross);
    return { booking, gross, commission, net: gross - commission, recognizedDay: vnDate(recognizedAt), status };
  };
  const ownCancellations = cancellations.filter(({ bookingId: booking }) => booking?.hotelId?.equals(hotel._id) && ['PAID', 'REFUNDED'].includes(booking.paymentStatus));
  const entries = [
    ...completed.map((booking) => toEntry(booking, Math.max(0, booking.totalAmount - refundedOf(booking)), booking.checkOutDate, 'COMPLETED')),
    ...ownCancellations.map((item) => toEntry(item.bookingId, item.cancellationFee, item.cancelledAt, 'CANCELLED')),
  ].filter((entry) => entry.gross > 0);
  return {
    entries,
    completedCount: completed.length,
    cancelledCount: ownCancellations.length,
    retainedFees: sumBy(ownCancellations, (item) => item.cancellationFee),
  };
};

const detailsByBooking = async (bookings) => {
  const details = await BookingDetail.find({ bookingId: { $in: bookings.map((booking) => booking._id) } }).lean();
  const grouped = new Map();
  details.forEach((detail) => {
    const key = String(detail.bookingId);
    grouped.set(key, [...(grouped.get(key) || []), detail]);
  });
  return grouped;
};

// Kỳ tối đa 31 ngày thì nhóm theo ngày, dài hơn thì nhóm theo tháng
const buildBuckets = (from, to) => {
  if (daysBetween(from, to) < 31) {
    const buckets = [];
    for (let day = from; day <= to; day = addDays(day, 1)) buckets.push({ key: day, label: `${day.slice(8)}/${day.slice(5, 7)}` });
    return { granularity: 'day', buckets, keyOf: (day) => day };
  }
  const buckets = [];
  let [year, month] = from.split('-').map(Number);
  for (let key = from.slice(0, 7); key <= to.slice(0, 7);) {
    buckets.push({ key, label: `${key.slice(5)}/${key.slice(0, 4)}` });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    key = `${year}-${String(month).padStart(2, '0')}`;
  }
  return { granularity: 'month', buckets, keyOf: (day) => day.slice(0, 7) };
};

// Khách quay lại: đã có đơn hoàn thành tại khách sạn này trước ngày nhận phòng của đơn đang xét (BR-64)
const loadFirstStays = async (hotelId, customerIds, now) => {
  const previous = await Booking.find({
    hotelId,
    customerId: { $in: customerIds },
    ...PAID_FILTER,
    $or: [{ bookingStatus: 'COMPLETED' }, { bookingStatus: 'CONFIRMED', checkOutDate: { $lt: now } }],
  }).select('customerId checkOutDate').lean();
  const firstStay = new Map();
  previous.forEach(({ customerId, checkOutDate }) => {
    const key = String(customerId);
    if (!firstStay.has(key) || checkOutDate < firstStay.get(key)) firstStay.set(key, checkOutDate);
  });
  return firstStay;
};

const latestPayoutOf = async (partnerId) => {
  const payout = await Payout.findOne({ partnerId }).sort({ periodStart: -1 }).lean();
  return payout ? toPayoutRow(payout) : null;
};

export const getStatistics = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { from, to } = req.query;
    const invalid = rangeError(from, to);
    if (invalid) return res.status(400).json({ message: invalid });

    const now = new Date();
    const [overlapping, roomTypes, revenue] = await Promise.all([
      Booking.find({
        hotelId: hotel._id,
        ...PAID_FILTER,
        bookingStatus: { $ne: 'PENDING_PAYMENT' },
        checkInDate: { $lte: endOfDay(to) },
        checkOutDate: { $gt: startOfDay(from) },
      }).lean(),
      RoomType.find({ hotelId: hotel._id, isDeleted: false }).lean(),
      loadRevenueEntries(hotel, from, to),
    ]);
    // Thống kê đặt phòng và khách tính theo đơn có ngày nhận phòng trong kỳ; công suất tính cả đơn ở vắt qua đầu kỳ
    const inPeriod = overlapping.filter((booking) => { const day = vnDate(booking.checkInDate); return day >= from && day <= to; });
    if (!inPeriod.length && !revenue.entries.length) return res.json({ hasData: false, message: NO_DATA_MESSAGE });

    const details = await detailsByBooking(overlapping);
    const stayed = inPeriod.filter((booking) => isCompleted(booking, now));
    const firstStay = await loadFirstStays(hotel._id, stayed.map((booking) => booking.customerId), now);
    const isReturning = (booking) => {
      const first = firstStay.get(String(booking.customerId));
      return Boolean(first) && first <= booking.checkInDate;
    };

    // Phòng-đêm đã đặt / phòng-đêm khả dụng (BR-64), chỉ tính phần lưu trú nằm trong kỳ
    const periodDays = daysBetween(from, to) + 1;
    const availableRoomNights = sumBy(roomTypes.filter((room) => room.status === 'ACTIVE'), (room) => room.totalRooms) * periodDays;
    const bookedRoomNights = sumBy(overlapping.filter((booking) => booking.bookingStatus !== 'CANCELLED'), (booking) => {
      const firstNight = vnDate(booking.checkInDate) > from ? vnDate(booking.checkInDate) : from;
      const dayAfterLast = addDays(to, 1);
      const lastExclusive = vnDate(booking.checkOutDate) < dayAfterLast ? vnDate(booking.checkOutDate) : dayAfterLast;
      const nights = Math.max(0, daysBetween(firstNight, lastExclusive));
      return nights * sumBy(details.get(String(booking._id)) || [], (detail) => detail.quantity);
    });
    const occupancy = availableRoomNights ? bookedRoomNights / availableRoomNights : 0;

    const { granularity, buckets, keyOf } = buildBuckets(from, to);
    const trend = buckets.map(({ key, label }) => {
      const checkedInHere = (booking) => keyOf(vnDate(booking.checkInDate)) === key;
      return {
        key,
        label,
        bookings: inPeriod.filter(checkedInHere).length,
        guests: sumBy(stayed.filter(checkedInHere), guestsOf),
        revenue: sumBy(revenue.entries.filter((entry) => keyOf(entry.recognizedDay) === key), (entry) => entry.gross),
      };
    });

    // Một đơn có thể gồm nhiều loại phòng: chia số khách và tiền theo tỷ lệ tiền phòng của từng dòng
    const entryDetails = await detailsByBooking(revenue.entries.map((entry) => entry.booking));
    const shareOf = (lines, line) => {
      const total = sumBy(lines, (item) => item.totalPrice);
      return total ? line.totalPrice / total : 1 / lines.length;
    };
    const rows = new Map(roomTypes.map((room) => [String(room._id), { key: String(room._id), roomTypeName: room.name, bookings: 0, guests: 0, revenueBookings: 0, gross: 0, commission: 0, net: 0 }]));
    const rowFor = (line) => {
      const key = String(line.roomTypeId);
      if (!rows.has(key)) rows.set(key, { key, roomTypeName: line.roomTypeName, bookings: 0, guests: 0, revenueBookings: 0, gross: 0, commission: 0, net: 0 });
      return rows.get(key);
    };
    inPeriod.forEach((booking) => {
      const lines = details.get(String(booking._id)) || [];
      lines.forEach((line) => {
        const row = rowFor(line);
        row.bookings += 1;
        if (isCompleted(booking, now)) row.guests += guestsOf(booking) * shareOf(lines, line);
      });
    });
    revenue.entries.forEach((entry) => {
      const lines = entryDetails.get(String(entry.booking._id)) || [];
      lines.forEach((line) => {
        const row = rowFor(line);
        const share = shareOf(lines, line);
        row.revenueBookings += 1;
        row.gross += entry.gross * share;
        row.commission += entry.commission * share;
        row.net += entry.net * share;
      });
    });
    const roomTypeRows = [...rows.values()].map((row) => ({
      ...row,
      guests: Math.round(row.guests),
      gross: Math.round(row.gross),
      commission: Math.round(row.commission),
      net: Math.round(row.net),
    }));

    const countByStatus = (status) => inPeriod.filter((booking) => effectiveStatus(booking, now) === status).length;
    const byStatus = ['CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => ({ status, count: countByStatus(status) }));
    const gross = sumBy(revenue.entries, (entry) => entry.gross);
    const commission = sumBy(revenue.entries, (entry) => entry.commission);
    const totalGuests = sumBy(stayed, guestsOf);
    const returningGuests = sumBy(stayed.filter(isReturning), guestsOf);

    res.json({
      hasData: true,
      granularity,
      trend,
      overview: { totalGuests, totalBookings: inPeriod.length, occupancy, gross, net: gross - commission, latestPayout: await latestPayoutOf(req.user._id) },
      guests: {
        total: totalGuests,
        new: totalGuests - returningGuests,
        returning: returningGuests,
        averagePerBooking: stayed.length ? totalGuests / stayed.length : 0,
      },
      bookings: {
        byStatus,
        cancellationRate: inPeriod.length ? countByStatus('CANCELLED') / inPeriod.length : 0,
        occupancy,
        averageStay: inPeriod.length ? sumBy(inPeriod, (booking) => booking.totalNights) / inPeriod.length : 0,
      },
      revenue: {
        gross,
        commission,
        net: gross - commission,
        completedCount: revenue.completedCount,
        cancelledCount: revenue.cancelledCount,
        retainedFees: revenue.retainedFees,
      },
      roomTypes: roomTypeRows,
    });
  } catch (error) { next(error); }
};

const toRevenueLines = async (entries) => {
  const details = await detailsByBooking(entries.map((entry) => entry.booking));
  return entries.map(({ booking, gross, commission, net, recognizedDay, status }) => ({
    _id: booking._id,
    bookingCode: booking.bookingCode,
    roomTypeName: (details.get(String(booking._id)) || []).map((line) => line.roomTypeName).join(', '),
    checkInDate: vnDate(booking.checkInDate),
    checkOutDate: vnDate(booking.checkOutDate),
    recognizedDay,
    bookingStatus: status,
    gross,
    commission,
    net,
  }));
};

export const getRevenueLines = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { from, to } = req.query;
    const invalid = rangeError(from, to);
    if (invalid) return res.status(400).json({ message: invalid });
    const { entries } = await loadRevenueEntries(hotel, from, to);
    entries.sort((left, right) => right.recognizedDay.localeCompare(left.recognizedDay));
    const limit = 8;
    const totalPages = Math.max(1, Math.ceil(entries.length / limit));
    const page = Math.min(Math.max(1, Number(req.query.page) || 1), totalPages);
    const lines = await toRevenueLines(entries.slice((page - 1) * limit, page * limit));
    res.json({ lines, pagination: { page, totalPages, total: entries.length } });
  } catch (error) { next(error); }
};

// Dữ liệu báo cáo doanh thu, không chứa thông tin liên hệ của khách (BR-57)
export const getRevenueReport = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { from, to } = req.query;
    const invalid = rangeError(from, to);
    if (invalid) return res.status(400).json({ message: invalid });
    const { entries } = await loadRevenueEntries(hotel, from, to);
    if (!entries.length) return res.status(400).json({ message: NO_DATA_MESSAGE });
    if (entries.length > MAX_REPORT_LINES) return res.status(400).json({ message: `Báo cáo vượt quá ${MAX_REPORT_LINES} dòng, vui lòng thu hẹp khoảng thời gian.` });
    entries.sort((left, right) => left.recognizedDay.localeCompare(right.recognizedDay));
    const gross = sumBy(entries, (entry) => entry.gross);
    const commission = sumBy(entries, (entry) => entry.commission);
    const lines = await toRevenueLines(entries);
    await AuditLog.create({ admin_id: req.user._id, action: 'REVENUE_REPORT_EXPORTED', entityType: 'HOTEL', entityId: hotel._id, metadata: { from, to, lines: lines.length } });
    res.json({ hotelName: hotel.name, from, to, lines, totals: { gross, commission, net: gross - commission } });
  } catch (error) { next(error); }
};

// Trạng thái của Payout quy về 4 trạng thái partner thấy theo SRS
const PAYOUT_STATUS_GROUPS = {
  PENDING: ['DRAFT', 'ON_HOLD', 'PENDING_APPROVAL'],
  PROCESSING: ['APPROVED'],
  PAID: ['PAID'],
  FAILED: ['REJECTED'],
};
const partnerPayoutStatus = (status) => Object.keys(PAYOUT_STATUS_GROUPS).find((key) => PAYOUT_STATUS_GROUPS[key].includes(status));

function toPayoutRow(payout) {
  return {
    _id: payout._id,
    payoutCode: `PO-${String(payout._id).slice(-6).toUpperCase()}`,
    periodStart: vnDate(payout.periodStart),
    periodEnd: vnDate(payout.periodEnd),
    grossRevenue: payout.grossRevenue,
    commissionAmount: payout.commissionAmount,
    adjustment: payout.refundAdjustment || 0,
    netAmount: payout.netAmount,
    paidAt: payout.paidAt,
    status: partnerPayoutStatus(payout.status),
    note: payout.holdReason || payout.reviewNote || '',
    paymentReference: payout.paymentReference,
  };
}

export const getPayouts = async (req, res, next) => {
  try {
    const { status, from, to } = req.query;
    if ((from || to) && rangeError(from, to)) return res.status(400).json({ message: rangeError(from, to) });
    const filter = { partnerId: req.user._id };
    if (status) {
      if (!PAYOUT_STATUS_GROUPS[status]) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
      filter.status = { $in: PAYOUT_STATUS_GROUPS[status] };
    }
    if (from && to) {
      filter.periodEnd = { $gte: startOfDay(from) };
      filter.periodStart = { $lte: endOfDay(to) };
    }
    const limit = 10;
    const total = await Payout.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(Math.max(1, Number(req.query.page) || 1), totalPages);
    const payouts = await Payout.find(filter).sort({ periodStart: -1 }).skip((page - 1) * limit).limit(limit).lean();
    res.json({ payouts: payouts.map(toPayoutRow), pagination: { page, totalPages, total } });
  } catch (error) { next(error); }
};

export const getPayout = async (req, res, next) => {
  try {
    const notFound = () => res.status(404).json({ message: 'Không tìm thấy khoản thanh toán.' });
    if (!mongoose.isValidObjectId(req.params.id)) return notFound();
    const payout = await Payout.findOne({ _id: req.params.id, partnerId: req.user._id }).lean();
    if (!payout) return notFound();
    const [bookings, cancellations] = await Promise.all([
      Booking.find({ _id: { $in: payout.bookingIds } }).select('bookingCode checkInDate checkOutDate totalAmount bookingStatus').lean(),
      BookingCancellation.find({ bookingId: { $in: payout.bookingIds } }).select('bookingId cancellationFee').lean(),
    ]);
    const commissionOf = (booking) => payout.commissionBreakdown.find((item) => item.bookingId.equals(booking._id))?.amount || 0;
    // Đơn hủy chỉ đóng góp phần phí giữ lại
    const grossOf = (booking) => (booking.bookingStatus === 'CANCELLED'
      ? cancellations.find((item) => item.bookingId.equals(booking._id))?.cancellationFee || 0
      : booking.totalAmount);
    res.json({
      payout: {
        ...toPayoutRow(payout),
        bookings: bookings.map((booking) => ({
          _id: booking._id,
          bookingCode: booking.bookingCode,
          checkInDate: vnDate(booking.checkInDate),
          checkOutDate: vnDate(booking.checkOutDate),
          gross: grossOf(booking),
          commission: commissionOf(booking),
          net: grossOf(booking) - commissionOf(booking),
        })),
      },
    });
  } catch (error) { next(error); }
};
