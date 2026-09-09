import express from 'express';
const router = express.Router();
import { pingAdmin } from '../controllers/adminController.js';

router.get('/ping', pingAdmin);

export default router;
