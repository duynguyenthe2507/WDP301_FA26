import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, role } = req.body;

    // Kiểm tra trạng thái rỗng
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: 'Bắt buộc phải có Email, mật khẩu và tên đầy đủ' });
    }

    // Kiểm tra tài khoản tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Đăng ký tài khoản
    const newUser = await User.create({
      email,
      password,
      fullName,
      phoneNumber,
      // Người dùng chỉ có thể tự đăng ký vai trò khách hàng hoặc đối tác.
      role: role === "PARTNER" ? "PARTNER" : "CUSTOMER",
      status: "ACTIVE",
      isEmailVerified,
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: {
        _id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
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

    // Tìm tài khoản
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email không tồn tại' });
    }

    if (!user.password) {
      return res.status(400).json({
        message: 'Tài khoản này không có mật khẩu'
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác' });
    }

    // Chỉ tài khoản ACTIVE mới được đăng nhập.
    if (user.status !== 'ACTIVE') {
      const message = user.status === 'SUSPENDED'
        ? 'Tài khoản đang tạm khóa để điều tra.'
        : 'Tài khoản đã bị khóa vĩnh viễn.';

      return res.status(403).json({ message });
    }

    // Tạo JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1d' } //Token có hiệu lực trong 1 ngày
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Đăng nhập lỗi:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

