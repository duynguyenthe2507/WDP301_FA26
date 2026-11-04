import express from 'express';
const router = express.Router();
import { createHotel, createPartnerChangeRequest, createSupportTicket, getMySupportTickets, pingPartner, getMyHotel, getMyHotelDetail, updateMyHotel, getRoomTypes, getRoomType, createRoomType, updateRoomType, updateRoomTypeStatus, deleteRoomType, uploadPartnerImages } from '../controllers/partnerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';
import { uploadImages } from '../middlewares/uploadMiddleware.js';

router.get('/ping', verifyToken, authorizeRoles('HOTEL_PARTNER'), pingPartner);
router.post('/uploads/images', verifyToken, authorizeRoles('HOTEL_PARTNER'), uploadImages, uploadPartnerImages);
router.post('/hotels', verifyToken, authorizeRoles('HOTEL_PARTNER'), createHotel);
router.post('/change-requests', verifyToken, authorizeRoles('HOTEL_PARTNER'), createPartnerChangeRequest);
router.post('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), createSupportTicket);
router.get('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), getMySupportTickets);
router.get('/hotels/me', verifyToken, authorizeRoles('HOTEL_PARTNER'), getMyHotel);
router.get('/hotel', verifyToken, authorizeRoles('HOTEL_PARTNER'), getMyHotelDetail);
router.put('/hotel', verifyToken, authorizeRoles('HOTEL_PARTNER'), updateMyHotel);
router.get('/room-types', verifyToken, authorizeRoles('HOTEL_PARTNER'), getRoomTypes);
router.post('/room-types', verifyToken, authorizeRoles('HOTEL_PARTNER'), createRoomType);
router.get('/room-types/:id', verifyToken, authorizeRoles('HOTEL_PARTNER'), getRoomType);
router.put('/room-types/:id', verifyToken, authorizeRoles('HOTEL_PARTNER'), updateRoomType);
router.patch('/room-types/:id/status', verifyToken, authorizeRoles('HOTEL_PARTNER'), updateRoomTypeStatus);
router.delete('/room-types/:id', verifyToken, authorizeRoles('HOTEL_PARTNER'), deleteRoomType);

export default router;

