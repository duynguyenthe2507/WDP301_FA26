import express from 'express';
import { register, login } from '../controllers/authController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private route cho tất cả các user hợp lệ (bất kể role nào)
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Chỉ OPERATIONS_MANAGER và ADMIN mới được truy cập
router.get('/internal-dashboard', verifyToken, authorizeRoles('OPERATIONS_MANAGER', 'ADMIN'), (req, res) => {
  res.json({ message: 'Khu vực làm việc cho nhân viên & quản trị viên' });
});

// Chỉ HOTEL_PARTNER, PARTNER được truy cập
router.get('/partner-portal', verifyToken, authorizeRoles('HOTEL_PARTNER'), (req, res) => {
  res.json({ message: 'Cổng thông tin đối tác' });
});

// Chỉ ADMIN có quyền quản lý hệ thống
router.get('/admin', verifyToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Danh sách quản lý người dùng toàn hệ thống' });
});

export default router;
