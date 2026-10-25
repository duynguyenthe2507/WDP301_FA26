import express from 'express';
import {
  getDashboard,
  getCommissionPolicies,
  getDisputes,
  getHotelPartners,
  getPartnerChangeRequests,
  getPayouts,
  getRefunds,
  getSupportTickets,
  getVerificationById,
  getVerifications,
  pingManager,
  reviewRefund,
  reviewVerification,
  createCommissionPolicy,
  generatePayout,
  reviewPayout,
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
router.get('/commission-policies', getCommissionPolicies);
router.post('/commission-policies', createCommissionPolicy);
router.get('/partners', getHotelPartners);
router.get('/payouts', getPayouts);
router.post('/payouts/generate', generatePayout);
router.patch('/payouts/:id/review', reviewPayout);
router.get('/partner-change-requests', getPartnerChangeRequests);
router.get('/support-tickets', getSupportTickets);

export default router;
