import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const roles = ['CUSTOMER', 'PARTNER', 'STAFF'];
const statuses = ['ACTIVE', 'BLOCKED'];

export const pingAdmin = (req, res) => {
  res.json(200)({ message: 'Admin API works!' });
};

// GET /api/admin/users: tìm và lọc tài khoản.
export const getUsers = async (req, res) => {
  try {
    const { search = '', role, status, from, to } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    // Tìm tên, email và số điện thoại, không phân biệt chữ hoa/thường.
    const keyword = typeof search === 'string' ? search.trim() : '';
    if (keyword) {
      const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { full_name: { $regex: safeKeyword, $options: 'i' } },
        { email: { $regex: safeKeyword, $options: 'i' } },
        { phone_number: { $regex: safeKeyword, $options: 'i' } },
      ];
    }

    // Ngày kết thúc được tính hết ngày đó.
    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setUTCHours(23, 59, 59, 999);
        filter.created_at.$lte = endDate;
      }
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ created_at: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Không thể tải danh sách tài khoản' });
  }
};

// PATCH /api/admin/users/:id: đổi vai trò hoặc trạng thái tài khoản.
export const updateUser = async (req, res) => {
  const { role, status } = req.body;

  if (!role && !status) {
    return res.status(400).json({ message: 'Hãy chọn vai trò hoặc trạng thái cần đổi' });
  }
  if (role && !roles.includes(role)) {
    return res.status(400).json({ message: 'Vai trò không hợp lệ' });
  }
  if (status && !statuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    }

    const isOwnAccount = user._id.toString() === req.user._id.toString();
    const removesOwnAdminRole = role && role !== 'ADMIN';
    const blocksOwnAccount = status && status !== 'ACTIVE';
    if (isOwnAccount && (removesOwnAdminRole || blocksOwnAccount)) {
      return res.status(403).json({
        message: 'Cannot modify or suspend your own active administrator account.',
      });
    }

    const oldRole = user.role;
    const oldStatus = user.status;
    if (role) user.role = role;
    if (status) user.status = status;

    const changes = [];
    if (oldRole !== user.role) changes.push('ROLE_UPDATED');
    if (oldStatus !== user.status) changes.push('STATUS_UPDATED');

    if (changes.length === 0) {
      return res.json({ message: 'Tài khoản không có thay đổi' });
    }

    await user.save();

    // Lưu lại ai đã đổi tài khoản nào và giá trị trước/sau khi đổi.
    await AuditLog.create({
      admin_id: req.user._id,
      target_user_id: user._id,
      action: changes.join(','),
      old_role: oldRole,
      new_role: user.role,
      old_status: oldStatus,
      new_status: user.status,
    });

    res.json({
      message: 'Cập nhật tài khoản thành công',
      user: await User.findById(user._id).select('-password'),
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Mã tài khoản không hợp lệ' });
    }
    res.status(500).json({ message: 'Không thể cập nhật tài khoản' });
  }
};
