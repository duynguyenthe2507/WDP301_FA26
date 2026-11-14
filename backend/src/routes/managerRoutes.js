import express from 'express';
const router = express.Router();
import {
  createCommissionPolicy,
  createManagerCompensation,
  generatePayout,
  getCommissionPolicies,
  getDashboard,
  getDisputes,
  getHotelPartners,
  getManagerAuditLogs,
  getManagerBookings,
  getManagerHotels,
  getPayouts,
  getRefunds,
  getVerificationById,
  getVerifications,
  pingManager,
  reviewPayout,
  reviewRefund,
  reviewVerification,
  updateCommissionPolicy,
  updateDispute,
} from '../controllers/managerController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

router.use(verifyToken, authorizeRoles('OPERATIONS_MANAGER'));

router.get('/ping', pingManager);
router.get('/dashboard', getDashboard);
router.get('/verifications', getVerifications);
router.get('/verifications/:id', getVerificationById);
router.patch('/verifications/:id/review', reviewVerification);
router.get('/disputes', getDisputes);
router.patch('/disputes/:id', updateDispute);
router.get('/bookings', getManagerBookings);
router.get('/refunds', getRefunds);
router.post('/refunds', createManagerCompensation);
router.patch('/refunds/:id/review', reviewRefund);
router.get('/hotels', getManagerHotels);
router.get('/commission-policies', getCommissionPolicies);
router.get('/partners', getHotelPartners);
router.post('/commission-policies', createCommissionPolicy);
router.patch('/commission-policies/:id', updateCommissionPolicy);
router.get('/payouts', getPayouts);
router.post('/payouts/generate', generatePayout);
router.patch('/payouts/:id/review', reviewPayout);
router.get('/audit-logs', getManagerAuditLogs);

export default router;
