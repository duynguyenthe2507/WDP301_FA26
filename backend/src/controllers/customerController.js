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
    const { fullName, phoneNumber, avatarUrl } = req.body;
    const updateData = {};

    if (fullName !== undefined) {
      if (fullName.trim().length < 2)
        return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự' });
      updateData.fullName = fullName.trim();
    }
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber.trim();
    }
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl.trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.status(200).json({
      message: 'Cập nhật thành công',
      user,
    });
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

// ==========================================
// VNPAY SANDBOX BOOKING & PAYMENT CONTROLLERS
// ==========================================
import Booking from '../models/Booking.js';
import { createPaymentUrl, createMockReturnUrl, verifyReturnData } from '../config/vnpay.js';

// POST /api/customer/bookings/pending
// Tạo đơn đặt phòng và sinh link chuyển hướng sang VNPay Sandbox
export const createPendingBooking = async (req, res) => {
  try {
    const {
      hotelId,
      hotelName,
      hotelAddress,
      bookerInfo,
      isSelfGuest,
      guestInfo,
      checkInDate,
      checkOutDate,
      totalNights,
      bookingDetails,
      totalAmount,
    } = req.body;

    // Kiểm tra thông tin người đặt
    if (!bookerInfo?.fullName?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập họ và tên người đặt phòng' });
    }
    if (!bookerInfo?.phoneNumber?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại người đặt phòng' });
    }
    if (!bookerInfo?.email?.trim() || !bookerInfo.email.includes('@')) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ' });
    }

    // Nếu đặt cho người khác: kiểm tra thông tin khách nhận phòng
    if (!isSelfGuest) {
      if (!guestInfo?.fullName?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập họ và tên khách nhận phòng' });
      }
      if (!guestInfo?.phoneNumber?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập số điện thoại khách nhận phòng' });
      }
    }

    // Sinh mã đặt phòng duy nhất: VNS + YYYYMMDD + 4 số ngẫu nhiên
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `VNS${dateStr}${randomSuffix}`;

    const newBooking = new Booking({
      bookingCode,
      customerId: req.user?._id || null,
      hotelId: hotelId || 'hotel_demo_01',
      hotelName: hotelName || 'Khách Sạn VinaStay',
      hotelAddress: hotelAddress || '',
      bookerInfo: {
        fullName: bookerInfo.fullName.trim(),
        phoneNumber: bookerInfo.phoneNumber.trim(),
        email: bookerInfo.email.trim().toLowerCase(),
      },
      isSelfGuest: Boolean(isSelfGuest),
      guestInfo: isSelfGuest
        ? { fullName: '', phoneNumber: '', email: '', notes: guestInfo?.notes || '' }
        : {
            fullName: guestInfo?.fullName?.trim() || '',
            phoneNumber: guestInfo?.phoneNumber?.trim() || '',
            email: guestInfo?.email?.trim() || '',
            notes: guestInfo?.notes?.trim() || '',
          },
      checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
      checkOutDate: checkOutDate ? new Date(checkOutDate) : new Date(Date.now() + 86400000),
      totalNights: Math.max(1, Number(totalNights) || 1),
      bookingDetails: bookingDetails && bookingDetails.length > 0 ? bookingDetails : [
        {
          roomTypeName: 'Phòng Deluxe',
          quantity: 1,
          pricePerNight: totalAmount || 1500000,
          totalPrice: totalAmount || 1500000,
        }
      ],
      totalAmount: Math.max(10000, Number(totalAmount) || 1500000),
      bookingStatus: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      paymentMethod: 'VNPAY',
    });

    await newBooking.save();

    // Lấy IP client
    // VNPay chỉ nhận IPv4: bỏ danh sách proxy, tiền tố ::ffff: và đổi ::1 về 127.0.0.1
    let ipAddr = String(
      req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        '127.0.0.1'
    )
      .split(',')[0]
      .trim()
      .replace(/^::ffff:/, '');
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ipAddr)) ipAddr = '127.0.0.1';

    // Tạo URL thanh toán VNPay Sandbox
    const { paymentUrl } =
      process.env.VNP_MOCK === 'true'
        ? { paymentUrl: createMockReturnUrl({ bookingCode, amount: newBooking.totalAmount }) }
        : createPaymentUrl({
            bookingCode,
            amount: newBooking.totalAmount,
            ipAddr,
            orderInfo: `Thanh toan don dat phong ${bookingCode}`,
          });

    res.status(201).json({
      message: 'Tạo đơn đặt phòng thành công, chuyển hướng đến VNPay Sandbox',
      booking: newBooking,
      paymentUrl,
    });
  } catch (error) {
    console.error('Error creating pending booking:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tạo đơn đặt phòng', error: error.message });
  }
};

// GET & POST /api/customer/bookings/vnpay-verify
// Xác thực kết quả giao dịch thanh toán từ VNPay Sandbox
export const verifyVNPayPayment = async (req, res) => {
  try {
    const vnpParams = { ...req.query, ...req.body };
    const {
      isSuccess,
      isHashValid,
      bookingCode,
      transactionNo,
      bankCode,
      cardType,
      payDate,
      responseCode,
    } = verifyReturnData(vnpParams);

    const booking = await Booking.findOne({ bookingCode });

    if (!booking) {
      return res.status(200).json({
        success: isSuccess,
        message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
        booking: {
          bookingCode,
          bookingStatus: isSuccess ? 'CONFIRMED' : 'PENDING_PAYMENT',
          paymentStatus: isSuccess ? 'PAID' : 'FAILED',
          vnpayTransaction: {
            vnp_TxnRef: bookingCode,
            vnp_TransactionNo: transactionNo || `VNP${Date.now()}`,
            vnp_BankCode: bankCode || 'NCB',
            vnp_ResponseCode: responseCode || (isSuccess ? '00' : '24'),
          },
        },
      });
    }

    if (isSuccess) {
      booking.bookingStatus = 'CONFIRMED';
      booking.paymentStatus = 'PAID';
      booking.vnpayTransaction = {
        vnp_TxnRef: bookingCode,
        vnp_TransactionNo: transactionNo || `VNP${Date.now()}`,
        vnp_BankCode: bankCode || 'NCB',
        vnp_CardType: cardType || 'ATM',
        vnp_PayDate: payDate || new Date().toISOString(),
        vnp_ResponseCode: responseCode || '00',
        vnp_OrderInfo: vnpParams.vnp_OrderInfo || '',
      };
      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Thanh toán VNPay thành công!',
        booking,
      });
    } else {
      booking.paymentStatus = 'FAILED';
      booking.vnpayTransaction = {
        vnp_TxnRef: bookingCode,
        vnp_ResponseCode: responseCode || '24',
      };
      await booking.save();

      return res.status(200).json({
        success: false,
        message: 'Giao dịch thanh toán không thành công hoặc người dùng đã hủy giao dịch',
        booking,
      });
    }
  } catch (error) {
    console.error('Error verifying VNPay payment:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác thực thanh toán VNPay', error: error.message });
  }
};

// GET /api/customer/bookings/:bookingCode
export const getBookingByCode = async (req, res) => {
  try {
    const { bookingCode } = req.params;
    const booking = await Booking.findOne({ bookingCode });
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }
    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin đơn đặt phòng', error: error.message });
  }
};

