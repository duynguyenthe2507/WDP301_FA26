import express from 'express';
const router = express.Router();
import { createHotel, createPartnerChangeRequest, createSupportTicket, getMySupportTickets, pingPartner } from '../controllers/partnerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

router.get('/ping', pingPartner);
//router.post('/hotels', verifyToken, authorizeRoles('PARTNER'), createHotel);
router.post('/hotels', createHotel);
router.post('/change-requests', verifyToken, authorizeRoles('HOTEL_PARTNER'), createPartnerChangeRequest);
router.post('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), createSupportTicket);
router.get('/support-tickets', verifyToken, authorizeRoles('HOTEL_PARTNER'), getMySupportTickets);

export default router;
