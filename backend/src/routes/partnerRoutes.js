import express from 'express';
const router = express.Router();
import { createHotel, pingPartner } from '../controllers/partnerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

router.get('/ping', pingPartner);
//router.post('/hotels', verifyToken, authorizeRoles('PARTNER'), createHotel);
router.post('/hotels', createHotel);

export default router;
