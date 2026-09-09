import express from 'express';
const router = express.Router();
import { pingCustomer } from '../controllers/customerController.js';

router.get('/ping', pingCustomer);

export default router;
