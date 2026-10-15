import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const roles = ['CUSTOMER', 'PARTNER', 'STAFF', 'ADMIN'];
const statuses = ['ACTIVE', 'SUSPENDED', 'BLOCKED'];

export const pingAdmin = (req, res) => {
  res.status(200).json({ message: 'Admin API works!' });
};

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Đếm số lượng tài khoản theo từng trạng thái trong DB
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "ACTIVE" });
    const suspendedUsers = await User.countDocuments({ status: "SUSPENDED" });
    const blockedUsers = await User.countDocuments({ status: "BLOCKED" });

    // 2. Lấy 5 bản ghi nhật ký mới nhất
    const recentLogs = await AuditLog.find()
      .populate("admin_id", "fullName")
      .populate("target_user_id", "fullName email")
      .sort({ createdAt: -1 })
      .limit(5);

    // 3. Trả kết quả về cho Frontend
    res.status(200).json({
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        blockedUsers,
      },
      recentLogs,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tải dữ liệu Dashboard" });
  }
};

// Lấy danh sách tài khoản theo các ô lọc trên trang admin.
export const getUsers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const role = req.query.role;
    const status = req.query.status;
    const from = req.query.from;
    const to = req.query.to;

    // filter là các điều kiện MongoDB dùng để tìm tài khoản.
    const filter = {};

    if (role) {
      if (!roles.includes(role)) {
        return res.status(400).json({ message: 'Vai trò không hợp lệ' });
      }
      filter.role = role;
    }

    if (status) {
      if (!statuses.includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
      }
      filter.status = status;
    }

    // Tìm từ khóa trong tên, email hoặc số điện thoại.
    if (typeof search === 'string' && search.trim() !== '') {
      const keyword = search.trim();
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { fullName: { $regex: safeKeyword, $options: 'i' } },
        { email: { $regex: safeKeyword, $options: 'i' } },
        { phoneNumber: { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    // Lọc theo ngày tài khoản được đăng ký.
    let startDate = null;
    let endDate = null;

    if (from) {
      startDate = new Date(from);
      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ message: 'Ngày bắt đầu không hợp lệ' });
      }
    }

    if (to) {
      endDate = new Date(to);
      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Ngày kết thúc không hợp lệ' });
      }

      // Lấy cả ngày kết thúc, đến 23:59:59.999.
      endDate.setUTCHours(23, 59, 59, 999);
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ message: 'Ngày bắt đầu phải trước ngày kết thúc' });
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Không thể tải danh sách tài khoản' });
  }
};

// Đổi trạng thái tài khoản và lưu lại lịch sử thay đổi.
export const updateUser = async (req, res) => {
  const body = req.body || {};
  const status = body.status;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!statuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  if (status !== 'ACTIVE' && reason === '') {
    return res.status(400).json({ message: 'Hãy nhập lý do khóa tài khoản' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    // Admin không được tự khóa tài khoản của chính mình.
    const isOwnAccount = user._id.toString() === req.user._id.toString();
    if (isOwnAccount && status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản của admin.' });
    }

    // BLOCKED là khóa vĩnh viễn, không thể đổi sang trạng thái khác.
    if (user.status === 'BLOCKED') {
      return res.status(409).json({ message: 'Tài khoản đã bị khóa vĩnh viễn' });
    }

    const oldStatus = user.status;
    const oldReason = user.status_reason || null;
    let newReason = reason;

    // Khi mở lại tài khoản thì xóa lý do khóa cũ.
    if (status === 'ACTIVE') {
      newReason = null;
    }

    if (oldStatus === status && oldReason === newReason) {
      return res.json({ message: 'Tài khoản không có thay đổi' });
    }

    user.status = status;
    user.status_reason = newReason;
    await user.save();

    let action = 'ACCOUNT_ACTIVATED';
    if (status === 'SUSPENDED') action = 'ACCOUNT_SUSPENDED';
    if (status === 'BLOCKED') action = 'ACCOUNT_DEACTIVATED';

    await AuditLog.create({
      admin_id: req.user._id,
      target_user_id: user._id,
      action: action,
      old_status: oldStatus,
      new_status: status,
      old_reason: oldReason,
      new_reason: newReason,
    });

    const updatedUser = await User.findById(user._id).select('-password');
    res.json({
      message: 'Cập nhật trạng thái tài khoản thành công',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user status error:', error);

    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Thông tin tài khoản không hợp lệ' });
    }

    res.status(500).json({ message: 'Không thể cập nhật trạng thái tài khoản' });
  }
};
