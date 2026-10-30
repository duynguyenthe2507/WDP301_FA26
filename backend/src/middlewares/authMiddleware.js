import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Xác thực Token & Trạng thái tài khoản
export const verifyToken = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

    // Kiểm tra user còn tồn tại và status hợp lệ
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    }

    // Chỉ tài khoản ACTIVE mới được sử dụng token
    if (user.status !== 'ACTIVE') {
      let message = 'Tài khoản của bạn đã bị khóa vĩnh viễn';

      if (user.status === 'SUSPENDED') {
        message = 'Tài khoản của bạn đang bị tạm khóa để điều tra';
      }

      return res.status(403).json({ message });
    }

    req.user = user; // Lưu thông tin user vào request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Phân quyền theo role
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Không tìm thấy vai trò người dùng' });
    }

    const userRole = req.user.role;
    // Cho phép tương thích ngược giữa PARTNER/HOTEL_PARTNER và STAFF/OPERATIONS_MANAGER
    const allowed = roles.some((r) => {
      if (r === userRole) return true;
      if (r === 'PARTNER' && userRole === 'HOTEL_PARTNER') return true;
      if (r === 'HOTEL_PARTNER' && userRole === 'PARTNER') return true;
      if (r === 'STAFF' && userRole === 'OPERATIONS_MANAGER') return true;
      if (r === 'OPERATIONS_MANAGER' && userRole === 'STAFF') return true;
      return false;
    });

    if (!allowed) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }

    next();
  };
};

// Xác thực tùy chọn (cho phép cả khách vãng lai và người đã đăng nhập)
export const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.status === 'ACTIVE') {
      req.user = user;
    }
  } catch (err) {
    // Không ném lỗi nếu token không hợp lệ hoặc hết hạn
  }
  next();
};
