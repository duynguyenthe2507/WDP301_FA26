import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { email, password, full_name, phone_number, role, status } = req.body;

    // Kiểm tra trạng thái rỗng
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Bắt buộc phải có Email, password, và full_name' });
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
      full_name,
      phone_number,
      role: role || 'CUSTOMER',
      status: status || 'ACTIVE',
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: {
        _id: newUser._id,
        email: newUser.email,
        full_name: newUser.full_name,
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
      return res.status(400).json({ message: 'Email và password là bắt buộc' });
    }

    // Tìm tài khoản
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc password không đúng' });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc password không đúng' });
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
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Đăng nhập lỗi:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

