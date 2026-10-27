import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';

// Tính lại điểm trung bình và tổng số đánh giá của khách sạn (0 review thì điểm = 0)
const updateHotelRatingSummary = async (hotelId) => {
  if (!hotelId) return;

  const reviews = await Review.find({ hotelId }).select('rating');

  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
  }
  const average = reviews.length > 0 ? Number((sum / reviews.length).toFixed(1)) : 0;

  await Hotel.updateOne(
    { _id: hotelId },
    { $set: { 'ratingSummary.averageRating': average, 'ratingSummary.totalReviews': reviews.length } }
  ).catch(() => {});
};

// GET /api/customer/reviews
// Lấy tất cả đánh giá của khách hàng đang đăng nhập
export const getMyReviews = async (req, res) => {
  try {
    const customerId = req.user._id;

    // Tìm các review gắn với customerId hoặc gắn với các booking của customer
    const userBookings = await Booking.find({
      $or: [{ customerId }, { 'bookerInfo.email': req.user.email?.toLowerCase() }],
    }).select('_id');

    const bookingIds = userBookings.map((b) => b._id);

    let reviews = await Review.find({
      $or: [{ customerId }, { bookingId: { $in: bookingIds } }],
    })
      .populate({
        path: 'bookingId',
        select: 'bookingCode hotelName hotelAddress checkInDate checkOutDate bookingDetails bookingStatus totalAmount',
      })
      .populate({
        path: 'hotelId',
        select: 'name address provinceCity images starRating',
      })
      .sort({ createdAt: -1 })
      .lean();

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const formattedReviews = reviews.map((r) => {
      const createdAtMs = new Date(r.createdAt).getTime();
      const expiresAtMs = createdAtMs + SEVEN_DAYS_MS;
      const canEditOrDelete = now <= expiresAtMs;
      const remainingMs = Math.max(0, expiresAtMs - now);
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

      return {
        ...r,
        canEditOrDelete,
        editableUntil: new Date(expiresAtMs),
        remainingDays,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách đánh giá:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đánh giá', error: error.message });
  }
};

// GET /api/customer/reviews/pending-bookings
// Lấy danh sách các kỳ nghỉ đã hoàn thành nhưng CHƯA đánh giá
export const getPendingReviewBookings = async (req, res) => {
  try {
    const customerId = req.user._id;
    const email = req.user.email?.toLowerCase();
    const now = new Date();

    // 1. Lấy tất cả đơn phòng của khách
    let filter = {
      $or: [{ customerId }, { 'bookerInfo.email': email }],
    };

    let bookings = await Booking.find(filter)
      .select('bookingCode hotelName hotelId checkInDate checkOutDate bookingDetails bookingStatus')
      .lean();

    // Lọc các kỳ nghỉ đã hoàn thành (bookingStatus == 'COMPLETED' hoặc ngày checkOut đã qua)
    const completedBookings = bookings.filter((b) => {
      if (b.bookingStatus === 'CANCELLED') return false;
      if (b.bookingStatus === 'COMPLETED') return true;
      if (b.checkOutDate && new Date(b.checkOutDate) < now) return true;
      return false;
    });

    // 2. Chỉ tìm review của chính các đơn đã hoàn thành này
    const completedIds = completedBookings.map((b) => b._id);
    const reviews = await Review.find({ bookingId: { $in: completedIds } }).select('bookingId').lean();
    const reviewedIds = new Set(reviews.map((r) => r.bookingId.toString()));

    // 3. Đơn nào không có trong danh sách đã đánh giá thì là CHƯA đánh giá
    const pendingBookings = completedBookings.filter((b) => !reviewedIds.has(b._id.toString()));

    res.status(200).json({
      success: true,
      count: pendingBookings.length,
      pendingBookings,
    });
  } catch (error) {
    console.error('Lỗi khi lấy đơn phòng chờ đánh giá:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

// POST /api/customer/reviews
// Gửi đánh giá mới cho một kỳ nghỉ
export const createReview = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { bookingId, rating, comment, images } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'Thiếu thông tin đơn đặt phòng (bookingId)' });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Nội dung đánh giá không được để trống' });
    }

    // 1. Kiểm tra đơn phòng có tồn tại không
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }

    // 2. Ràng buộc: 1 Booking tương ứng tối đa 1 Review
    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      return res.status(400).json({
        message: 'Kỳ nghỉ này đã được đánh giá rồi. Mỗi kỳ nghỉ chỉ được đánh giá tối đa 1 lần.',
      });
    }

    // 3. Tìm hotelId tương ứng
    let hotelObjectId = null;
    if (booking.hotelId && mongoose.isValidObjectId(booking.hotelId)) {
      hotelObjectId = new mongoose.Types.ObjectId(booking.hotelId);
    } else {
      const foundHotel = await Hotel.findOne({ name: booking.hotelName });
      if (!foundHotel) {
        return res.status(404).json({ message: 'Không tìm thấy khách sạn của đơn đặt phòng này' });
      }
      hotelObjectId = foundHotel._id;
    }

    // Chuẩn hóa định dạng mảng ảnh
    const formattedImages = Array.isArray(images)
      ? images.map((img) => {
          if (typeof img === 'string') {
            return { url: img, publicId: img.split('/').pop() || 'review_img' };
          }
          return {
            url: img.url || '',
            publicId: img.publicId || (img.url ? img.url.split('/').pop() : 'review_img'),
          };
        }).filter((img) => img.url)
      : [];

    const newReview = await Review.create({
      bookingId: booking._id,
      hotelId: hotelObjectId,
      customerId,
      rating: numRating,
      comment: comment.trim(),
      images: formattedImages,
      createdAt: new Date(),
    });

    await updateHotelRatingSummary(hotelObjectId);

    const populatedReview = await Review.findById(newReview._id)
      .populate({
        path: 'bookingId',
        select: 'bookingCode hotelName checkInDate checkOutDate bookingDetails',
      })
      .populate({
        path: 'hotelId',
        select: 'name address provinceCity images',
      })
      .lean();

    res.status(201).json({
      success: true,
      message: 'Gửi đánh giá kỳ nghỉ thành công!',
      review: {
        ...populatedReview,
        canEditOrDelete: true,
        editableUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.error('Lỗi khi gửi đánh giá:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi gửi đánh giá', error: error.message });
  }
};

// PUT /api/customer/reviews/:id
// Chỉnh sửa đánh giá (Chỉ cho phép trong vòng 7 ngày kể từ khi đăng)
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, images } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá này' });
    }

    // Kiểm tra quyền sở hữu đánh giá
    if (String(review.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa đánh giá này' });
    }

    // Kiểm tra quy tắc 7 ngày (7 days from createdAt)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const createdAtMs = new Date(review.createdAt).getTime();
    if (Date.now() - createdAtMs > SEVEN_DAYS_MS) {
      return res.status(400).json({
        message: 'Đã quá thời hạn 7 ngày kể từ khi đăng. Bạn không thể chỉnh sửa đánh giá này nữa.',
      });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 5 sao' });
      }
      review.rating = numRating;
    }

    if (comment !== undefined) {
      if (!comment.trim()) {
        return res.status(400).json({ message: 'Nội dung đánh giá không được để trống' });
      }
      review.comment = comment.trim();
    }

    if (images !== undefined && Array.isArray(images)) {
      review.images = images.map((img) => {
        if (typeof img === 'string') {
          return { url: img, publicId: img.split('/').pop() || 'review_img' };
        }
        return {
          url: img.url || '',
          publicId: img.publicId || (img.url ? img.url.split('/').pop() : 'review_img'),
        };
      }).filter((img) => img.url);
    }

    await review.save();

    const populated = await Review.findById(review._id)
      .populate({
        path: 'bookingId',
        select: 'bookingCode hotelName checkInDate checkOutDate bookingDetails',
      })
      .populate({
        path: 'hotelId',
        select: 'name address provinceCity images',
      })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công!',
      review: {
        ...populated,
        canEditOrDelete: true,
        editableUntil: new Date(createdAtMs + SEVEN_DAYS_MS),
      },
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật đánh giá:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật đánh giá', error: error.message });
  }
};

// DELETE /api/customer/reviews/:id
// Xóa đánh giá (Chỉ cho phép trong vòng 7 ngày kể từ khi đăng)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá này' });
    }

    // Kiểm tra quyền sở hữu đánh giá
    if (String(review.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa đánh giá này' });
    }

    // Kiểm tra quy tắc 7 ngày (7 days from createdAt)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const createdAtMs = new Date(review.createdAt).getTime();
    if (Date.now() - createdAtMs > SEVEN_DAYS_MS) {
      return res.status(400).json({
        message: 'Đã quá thời hạn 7 ngày kể từ khi đăng. Bạn không thể xóa đánh giá này nữa.',
      });
    }

    const hotelId = review.hotelId;
    await Review.deleteOne({ _id: id });

    await updateHotelRatingSummary(hotelId);

    res.status(200).json({
      success: true,
      message: 'Đã xóa đánh giá thành công. Mỗi kỳ nghỉ chỉ được đánh giá một lần.',
    });
  } catch (error) {
    console.error('Lỗi khi xóa đánh giá:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi xóa đánh giá', error: error.message });
  }
};

// GET /api/customer/reviews/booking-info/:bookingId
// Lấy thông tin đơn đặt phòng và khách sạn phục vụ trang "Chia sẻ trải nghiệm lưu trú"
export const getBookingReviewInfo = async (req, res) => {
  try {
    const { bookingId } = req.params;

    let booking = null;
    if (mongoose.isValidObjectId(bookingId)) {
      booking = await Booking.findById(bookingId).lean();
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingCode: bookingId }).lean();
    }
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin kỳ nghỉ này' });
    }

    const existingReview = await Review.findOne({ bookingId: booking._id }).lean();

    let hotel = null;
    if (booking.hotelId && mongoose.isValidObjectId(booking.hotelId)) {
      hotel = await Hotel.findById(booking.hotelId).lean();
    }
    if (!hotel) {
      hotel = await Hotel.findOne({ name: booking.hotelName }).lean() || await Hotel.findOne().lean();
    }

    res.status(200).json({
      success: true,
      booking,
      hotel,
      hasReviewed: Boolean(existingReview),
      existingReview,
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin đơn để đánh giá:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

