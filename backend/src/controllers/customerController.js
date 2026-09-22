import User from '../models/User.js';

export const pingCustomer = (req, res) => {
  res.status(200).json({ message: 'Customer API works!' });
};

// GET /api/customer/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

// PUT /api/customer/profile
export const updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number } = req.body;
    const updateData = {};

    if (full_name !== undefined) {
      if (full_name.trim().length < 2)
        return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự' });
      updateData.full_name = full_name.trim();
    }
    if (phone_number !== undefined) {
      updateData.phone_number = phone_number.trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.status(200).json({ message: 'Cập nhật thành công', user });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

// PUT /api/customer/change-password
export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password)
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    if (new_password.length < 8)
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    if (new_password !== confirm_password)
      return res.status(400).json({ message: 'Xác nhận mật khẩu không khớp' });

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch)
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });

    user.password = new_password;
    await user.save(); // trigger pre-save hook để hash password mới

    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};
