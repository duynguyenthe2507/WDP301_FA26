import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingDetail from '../models/BookingDetail.js';
import Review from '../models/Review.js';
import RoomType from '../models/RoomType.js';
import User from '../models/User.js';
import { findApprovedHotel, notApproved } from './partnerController.js';
import { endOfDay, isValidDay, rangeError, startOfDay, vnDate } from './partnerStatisticsController.js';

const PAGE_SIZE = 10;
const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

// Tổng quan tính trên toàn bộ đánh giá của khách sạn, không phụ thuộc bộ lọc
const loadSummary = async (hotelId) => {
  const groups = await Review.aggregate([
    { $match: { hotelId } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  groups.forEach(({ _id, count }) => { distribution[_id] = count; });
  const totalReviews = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const totalScore = Object.entries(distribution).reduce((sum, [star, count]) => sum + Number(star) * count, 0);
  return {
    averageRating: totalReviews ? Math.round((totalScore / totalReviews) * 10) / 10 : 0,
    totalReviews,
    distribution,
  };
};

// Partner chỉ xem, không sửa/xóa/ẩn/trả lời đánh giá (BR-31)
export const getPartnerReviews = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { rating, from, to, roomTypeId, withComment, sort = 'newest' } = req.query;
    if ((from && !isValidDay(from)) || (to && !isValidDay(to)) || (from && to && rangeError(from, to))) {
      return res.status(400).json({ message: rangeError(from || to, to || from) || rangeError(from, to) });
    }
    if (rating && !['1', '2', '3', '4', '5'].includes(rating)) return res.status(400).json({ message: 'Số sao không hợp lệ.' });
    if (!SORTS[sort]) return res.status(400).json({ message: 'Cách sắp xếp không hợp lệ.' });

    const roomTypes = await RoomType.find({ hotelId: hotel._id }).select('name isDeleted').sort({ createdAt: 1 }).lean();
    if (roomTypeId && !mongoose.isValidObjectId(roomTypeId)) return res.status(400).json({ message: 'Loại phòng không hợp lệ.' });
    if (roomTypeId && !roomTypes.some((roomType) => roomType._id.equals(roomTypeId))) {
      return res.status(400).json({ message: 'Loại phòng không hợp lệ.' });
    }

    const filter = { hotelId: hotel._id };
    if (rating) filter.rating = Number(rating);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = startOfDay(from);
      if (to) filter.createdAt.$lte = endOfDay(to);
    }
    // comment là bắt buộc trong model nhưng vẫn loại các bình luận chỉ có khoảng trắng
    if (withComment === 'true') filter.comment = { $regex: /\S/ };
    if (roomTypeId) {
      filter.bookingId = { $in: await BookingDetail.distinct('bookingId', { roomTypeId: new mongoose.Types.ObjectId(roomTypeId) }) };
    }

    const [summary, total] = await Promise.all([loadSummary(hotel._id), Review.countDocuments(filter)]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, Number(req.query.page) || 1), totalPages);
    const reviews = await Review.find(filter)
      .sort({ ...SORTS[sort], _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();

    const bookingIds = reviews.map((review) => review.bookingId);
    const [reviewers, bookings, details] = await Promise.all([
      User.find({ _id: { $in: reviews.map((review) => review.customerId) } }).select('fullName').lean(),
      Booking.find({ _id: { $in: bookingIds } }).select('checkInDate checkOutDate').lean(),
      BookingDetail.find({ bookingId: { $in: bookingIds } }).select('bookingId roomTypeName').lean(),
    ]);
    const bookingOf = (review) => bookings.find((booking) => booking._id.equals(review.bookingId));

    res.json({
      hotel: { _id: hotel._id, name: hotel.name },
      summary,
      // Giữ cả loại phòng đã xóa mềm để vẫn lọc được các đánh giá cũ
      roomTypes: roomTypes.map(({ _id, name, isDeleted }) => ({ _id, name: isDeleted ? `${name} (đã xóa)` : name })),
      // Chỉ trả tên hiển thị, không có email/số điện thoại của khách (BR-32)
      reviews: reviews.map((review) => {
        const booking = bookingOf(review);
        return {
          _id: review._id,
          reviewerName: reviewers.find((user) => user._id.equals(review.customerId))?.fullName || 'Khách hàng',
          rating: review.rating,
          comment: review.comment,
          images: (review.images || []).map(({ url }) => ({ url })),
          createdAt: review.createdAt,
          roomTypeNames: [...new Set(details.filter((detail) => detail.bookingId.equals(review.bookingId)).map((detail) => detail.roomTypeName))],
          checkInDate: booking ? vnDate(booking.checkInDate) : null,
          checkOutDate: booking ? vnDate(booking.checkOutDate) : null,
        };
      }),
      pagination: { page, totalPages, total },
    });
  } catch (error) { next(error); }
};
