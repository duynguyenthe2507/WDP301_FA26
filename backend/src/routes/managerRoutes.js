import express from 'express';
const router = express.Router();
import {
  createCommissionPolicy,
  generatePayout,
  getCommissionPolicies,
  getDashboard,
  getDisputes,
  getHotelPartners,
  getManagerAuditLogs,
  getPayouts,
  getPartnerChangeRequests,
  getRefunds,
  getSupportTickets,
  getVerificationById,
  getVerifications,
  pingManager,
  reviewPayout,
  reviewPartnerChangeRequest,
  reviewRefund,
  reviewVerification,
  respondToSupportTicket,
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
router.get('/partner-change-requests', getPartnerChangeRequests);
router.patch('/partner-change-requests/:id/review', reviewPartnerChangeRequest);
router.get('/support-tickets', getSupportTickets);
router.patch('/support-tickets/:id/respond', respondToSupportTicket);
router.get('/disputes', getDisputes);
router.patch('/disputes/:id', updateDispute);
router.get('/refunds', getRefunds);
router.patch('/refunds/:id/review', reviewRefund);
router.get('/commission-policies', getCommissionPolicies);
router.get('/partners', getHotelPartners);
router.post('/commission-policies', createCommissionPolicy);
router.patch('/commission-policies/:id', updateCommissionPolicy);
router.get('/payouts', getPayouts);
router.post('/payouts/generate', generatePayout);
router.patch('/payouts/:id/review', reviewPayout);
router.get('/audit-logs', getManagerAuditLogs);

export default router;

