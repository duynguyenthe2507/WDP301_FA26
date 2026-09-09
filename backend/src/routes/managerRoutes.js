import express from 'express';
const router = express.Router();
import { pingManager } from '../controllers/managerController.js';

router.get('/ping', pingManager);

export default router;
