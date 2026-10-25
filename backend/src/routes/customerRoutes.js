import express from 'express';
const router = express.Router();
import {
  pingCustomer,
  getProfile,
  updateProfile,
  changePassword,
  createPendingBooking,
  verifyVNPayPayment,
  getBookingByCode,
  getMyBookings,
} from '../controllers/customerController.js';
import {
  getHotels,
  getHotelById,
  checkRoomAvailability,
  getHotelReviews,
} from '../controllers/hotelController.js';
import {
  getMyReviews,
  getPendingReviewBookings,
  getBookingReviewInfo,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

router.get('/ping', pingCustomer);

// Profile routes (yêu cầu đăng nhập với role CUSTOMER)
router.get('/profile', verifyToken, authorizeRoles('CUSTOMER'), getProfile);
router.put('/profile', verifyToken, authorizeRoles('CUSTOMER'), updateProfile);
router.put('/change-password', verifyToken, authorizeRoles('CUSTOMER'), changePassword);

// VNPay Sandbox Booking & Payment routes
// Đặt phòng & xem đơn yêu cầu đăng nhập CUSTOMER (khách vãng lai chỉ được xem phòng)
router.post('/bookings/pending', verifyToken, authorizeRoles('CUSTOMER'), createPendingBooking);
router.get('/bookings/vnpay-verify', verifyVNPayPayment);
router.post('/bookings/vnpay-verify', verifyVNPayPayment);
router.get('/my-bookings', verifyToken, authorizeRoles('CUSTOMER'), getMyBookings);
router.get('/bookings/:bookingCode', verifyToken, authorizeRoles('CUSTOMER'), getBookingByCode);

// Đánh giá kỳ nghỉ (Customer Reviews)
router.get('/reviews', verifyToken, authorizeRoles('CUSTOMER'), getMyReviews);
router.get('/reviews/pending-bookings', verifyToken, authorizeRoles('CUSTOMER'), getPendingReviewBookings);
router.get('/reviews/booking-info/:bookingId', verifyToken, authorizeRoles('CUSTOMER'), getBookingReviewInfo);
router.post('/reviews', verifyToken, authorizeRoles('CUSTOMER'), createReview);
router.put('/reviews/:id', verifyToken, authorizeRoles('CUSTOMER'), updateReview);
router.delete('/reviews/:id', verifyToken, authorizeRoles('CUSTOMER'), deleteReview);


// Hotel routes (Search, Filter, Detail, Availability, Reviews)
router.get('/hotels', getHotels);
router.get('/hotels/:id', getHotelById);
router.get('/hotels/:id/availability', checkRoomAvailability);
router.get('/hotels/:id/reviews', getHotelReviews);

export default router;



