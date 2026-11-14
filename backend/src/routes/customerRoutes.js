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
  getCancelBookingInfo,
  cancelBooking,
  createDispute,
  withdrawDispute,
  getBookingDisputeInfo,
  getMyDisputes,
  createRefundRequest,
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
import { uploadImages, uploadDisputeFiles } from '../middlewares/uploadMiddleware.js';
import { uploadReviewImages, uploadDisputeAttachments } from '../controllers/uploadController.js';

router.get('/ping', pingCustomer);

// Profile routes (requires CUSTOMER role)
router.get('/profile', verifyToken, authorizeRoles('CUSTOMER'), getProfile);
router.put('/profile', verifyToken, authorizeRoles('CUSTOMER'), updateProfile);
router.put('/change-password', verifyToken, authorizeRoles('CUSTOMER'), changePassword);

// VNPay Sandbox Booking & Payment routes
// Booking requires CUSTOMER role (guests can only view rooms)
router.post('/bookings/pending', verifyToken, authorizeRoles('CUSTOMER'), createPendingBooking);
router.get('/bookings/vnpay-verify', verifyVNPayPayment);
router.post('/bookings/vnpay-verify', verifyVNPayPayment);

router.get('/bookings/:idOrCode/cancel-info', verifyToken, authorizeRoles('CUSTOMER'), getCancelBookingInfo);
router.post('/bookings/:idOrCode/cancel', verifyToken, authorizeRoles('CUSTOMER'), cancelBooking);
router.get('/my-bookings', verifyToken, authorizeRoles('CUSTOMER'), getMyBookings);
router.get('/bookings/:bookingCode', verifyToken, authorizeRoles('CUSTOMER'), getBookingByCode);
router.get('/disputes/booking-info/:idOrCode', verifyToken, authorizeRoles('CUSTOMER'), getBookingDisputeInfo);
router.get('/my-disputes', verifyToken, authorizeRoles('CUSTOMER'), getMyDisputes);
router.post('/disputes', verifyToken, authorizeRoles('CUSTOMER'), createDispute);
router.patch('/disputes/:id/withdraw', verifyToken, authorizeRoles('CUSTOMER'), withdrawDispute);
router.post('/refunds', verifyToken, authorizeRoles('CUSTOMER'), createRefundRequest);

// Customer reviews
router.get('/reviews', verifyToken, authorizeRoles('CUSTOMER'), getMyReviews);
router.get('/reviews/pending-bookings', verifyToken, authorizeRoles('CUSTOMER'), getPendingReviewBookings);
router.get('/reviews/booking-info/:bookingId', verifyToken, authorizeRoles('CUSTOMER'), getBookingReviewInfo);
router.post('/reviews', verifyToken, authorizeRoles('CUSTOMER'), createReview);
router.put('/reviews/:id', verifyToken, authorizeRoles('CUSTOMER'), updateReview);
router.delete('/reviews/:id', verifyToken, authorizeRoles('CUSTOMER'), deleteReview);


// Upload routes (review images and dispute attachments)
router.post('/upload/review-images', verifyToken, authorizeRoles('CUSTOMER'), uploadImages, uploadReviewImages);
router.post('/upload/dispute-files', verifyToken, authorizeRoles('CUSTOMER'), uploadDisputeFiles, uploadDisputeAttachments);

// Hotel routes (search, filter, detail, availability, reviews)
router.get('/hotels', getHotels);
router.get('/hotels/:id', getHotelById);
router.get('/hotels/:id/availability', checkRoomAvailability);
router.get('/hotels/:id/reviews', getHotelReviews);

export default router;



