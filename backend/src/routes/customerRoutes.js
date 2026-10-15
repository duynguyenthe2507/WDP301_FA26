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

export default router;


