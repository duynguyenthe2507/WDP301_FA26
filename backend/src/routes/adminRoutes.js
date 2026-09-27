import express from 'express';
const router = express.Router();
import {
  getUsers,
  pingAdmin,
  updateUser,
} from '../controllers/adminController.js';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware.js';

router.use(verifyToken, authorizeRoles('ADMIN'));
router.get('/ping', pingAdmin);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);

export default router;
