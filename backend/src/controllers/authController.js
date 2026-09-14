import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body; // Token Google trả về từ frontend

    // 1. Xác thực Token trực tiếp với Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // 2. Tìm xem user đã tồn tại chưa
    let user = await User.findOne({ email });

    if (!user) {
      // Nếu chưa có, tạo user mới
      user = await User.create({
        email,
        full_name: name,
        auth_type: 'GOOGLE',
        status: 'ACTIVE',
        role: 'CUSTOMER'
      });
    }

    // 3. Kiểm tra status bị khóa
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    // 4. Cấp JWT của hệ thống bạn
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập Google thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Xác thực Google thất bại: ' + error.message });
  }
};


export const register = async (req, res) => {
  try {
    const { email, password, full_name, phone_number, role, status } = req.body;

    // Kiểm tra trạng thái rỗng
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Bắt buộc phải có Email, mật khẩu và tên đầy đủ' });
    }

    // Kiểm tra tài khoản tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    if (existingUser.auth_type === 'GOOGLE') {
      return res.status(400).json({
        message: 'Tài khoản này được đăng ký bằng Google. Vui lòng bấm vào nút "Đăng nhập bằng Google".'
      });
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
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    // Tìm tài khoản
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email không tồn tại' });
    }

    if (!user.password || user.auth_type === 'GOOGLE') {
      return res.status(400).json({
        message: 'Tài khoản này được đăng ký bằng Google. Vui lòng bấm vào nút "Đăng nhập bằng Google".'
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác' });
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

