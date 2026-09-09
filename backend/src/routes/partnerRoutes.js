import express from 'express';
const router = express.Router();
import { pingPartner } from '../controllers/partnerController.js';

router.get('/ping', pingPartner);

export default router;
