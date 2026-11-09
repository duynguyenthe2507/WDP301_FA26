import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, role } = req.body;

    // Kiểm tra trạng thái rỗng
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Bắt buộc phải có Email, mật khẩu và tên đầy đủ' });
    }

    // Kiểm tra độ dài mật khẩu tối thiểu 6 ký tự
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Chuẩn hóa Email
    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra tài khoản tồn tại
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Đăng ký tài khoản
    const newUser = await User.create({
      email: normalizedEmail,
      password,
      fullName: fullName.trim(),
      phoneNumber: (phoneNumber || '').trim(),
      avatarUrl: (req.body.avatarUrl || '').trim(),
      // Chỉ được tự đăng ký khách hàng hoặc đối tác; không nhận role khác từ client
      role: ['PARTNER', 'HOTEL_PARTNER'].includes(role) ? 'HOTEL_PARTNER' : 'CUSTOMER',
      status: 'ACTIVE',
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: {
        _id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role,
        status: newUser.status,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Đăng ký lỗi:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    // Chuẩn hóa Email
    const normalizedEmail = email.trim().toLowerCase();

    // Tìm tài khoản
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Email không tồn tại' });
    }

    // Kiểm tra trạng thái tài khoản (chỉ kiểm tra BLOCKED và SUSPENDED theo enum schema)
    if (['BLOCKED', 'SUSPENDED'].includes(user.status)) {
      const message = user.status === 'SUSPENDED'
        ? 'Tài khoản của bạn đang bị tạm khóa để điều tra.'
        : 'Tài khoản của bạn đã bị khóa vĩnh viễn.';
      return res.status(403).json({ message });
    }

    // Kiểm tra mật khẩu bằng method đối tượng của User Model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác' });
    }

    // Chỉ tài khoản ACTIVE mới được đăng nhập
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt.' });
    }

    // Tạo JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1d' } // Token có hiệu lực trong 1 ngày
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Đăng nhập lỗi:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};
