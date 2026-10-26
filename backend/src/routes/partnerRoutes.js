import express from 'express';
const router = express.Router();
import { createHotel, createPartnerChangeRequest, createSupportTicket, getMySupportTickets, pingPartner } from '../controllers/partnerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

router.get('/ping', verifyToken, authorizeRoles('HOTEL_PARTNER'), pingPartner);
router.post('/hotels', verifyToken, authorizeRoles('HOTEL_PARTNER'), createHotel);
router.post('/change-requests', verifyToken, authorizeRoles('HOTEL_PARTNER'), createPartnerChangeRequest);
router.post('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), createSupportTicket);
router.get('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), getMySupportTickets);

export default router;

