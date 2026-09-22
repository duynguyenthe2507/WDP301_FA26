import express from 'express';
const router = express.Router();
import { pingCustomer, getProfile, updateProfile, changePassword } from '../controllers/customerController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

router.get('/ping', pingCustomer);

// Profile routes (yêu cầu đăng nhập với role CUSTOMER)
router.get('/profile', verifyToken, authorizeRoles('CUSTOMER'), getProfile);
router.put('/profile', verifyToken, authorizeRoles('CUSTOMER'), updateProfile);
router.put('/change-password', verifyToken, authorizeRoles('CUSTOMER'), changePassword);

export default router;

