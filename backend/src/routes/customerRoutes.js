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
import { verifyToken, authorizeRoles, optionalAuth } from '../middlewares/authMiddleware.js';

router.get('/ping', pingCustomer);

// Profile routes (yêu cầu đăng nhập với role CUSTOMER)
router.get('/profile', verifyToken, authorizeRoles('CUSTOMER'), getProfile);
router.put('/profile', verifyToken, authorizeRoles('CUSTOMER'), updateProfile);
router.put('/change-password', verifyToken, authorizeRoles('CUSTOMER'), changePassword);

// VNPay Sandbox Booking & Payment routes
router.post('/bookings/pending', optionalAuth, createPendingBooking);
router.get('/bookings/vnpay-verify', verifyVNPayPayment);
router.post('/bookings/vnpay-verify', verifyVNPayPayment);
router.get('/my-bookings', optionalAuth, getMyBookings);
router.get('/bookings/:bookingCode', getBookingByCode);

// Hotel routes (Search, Filter, Detail, Availability, Reviews)
router.get('/hotels', getHotels);
router.get('/hotels/:id', getHotelById);
router.get('/hotels/:id/availability', checkRoomAvailability);
router.get('/hotels/:id/reviews', getHotelReviews);

export default router;
