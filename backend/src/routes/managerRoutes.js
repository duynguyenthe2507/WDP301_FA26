import express from 'express';
import {
  getDashboard,
  getDisputes,
  getRefunds,
  getVerificationById,
  getVerifications,
  pingManager,
  reviewRefund,
  reviewVerification,
  updateDispute,
} from '../controllers/managerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('OPERATIONS_MANAGER'));
router.get('/ping', pingManager);
router.get('/dashboard', getDashboard);
router.get('/verifications', getVerifications);
router.get('/verifications/:id', getVerificationById);
router.patch('/verifications/:id/review', reviewVerification);
router.get('/disputes', getDisputes);
router.patch('/disputes/:id', updateDispute);
router.get('/refunds', getRefunds);
router.patch('/refunds/:id/review', reviewRefund);

export default router;
