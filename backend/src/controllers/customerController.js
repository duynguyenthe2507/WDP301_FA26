import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';
import { createPaymentUrl, verifyReturnData } from '../config/vnpay.js';

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

// Tự động xóa các đơn đặt phòng ở trạng thái chờ thanh toán quá 15 phút
export const cleanExpiredPendingBookings = async () => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const deleteResult = await Booking.deleteMany({
      bookingStatus: 'PENDING_PAYMENT',
      paymentStatus: { $ne: 'PAID' },
      createdAt: { $lte: fifteenMinutesAgo },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`[Auto-Clean] Đã tự động xóa ${deleteResult.deletedCount} đơn phòng PENDING_PAYMENT quá hạn 15 phút.`);
    }
  } catch (error) {
    console.error('Lỗi khi tự động dọn dẹp đơn phòng quá hạn:', error.message);
  }
};

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
      specialRequests,
      checkInDate,
      checkOutDate,
      totalNights,
      totalAdults,
      totalChildren,
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

    // Validate ngày nhận và trả phòng
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Vui lòng chọn ngày nhận phòng và ngày trả phòng' });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ message: 'Định dạng ngày nhận/trả phòng không hợp lệ' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInStart = new Date(checkIn);
    checkInStart.setHours(0, 0, 0, 0);

    if (checkInStart < today) {
      return res.status(400).json({ message: 'Ngày nhận phòng không được ở trong quá khứ' });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({ message: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày' });
    }

    // Validate số lượng phòng đặt
    if (!bookingDetails || !Array.isArray(bookingDetails) || bookingDetails.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 loại phòng để đặt' });
    }

    const hasInvalidRoom = bookingDetails.some((item) => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidRoom) {
      return res.status(400).json({ message: 'Số lượng phòng đặt không hợp lệ' });
    }

    if (!Number(totalAmount) || Number(totalAmount) < 10000) {
      return res.status(400).json({ message: 'Tổng tiền đặt phòng không hợp lệ' });
    }
    // Kiem tra so phong con trong truoc khi tao don
    if (hotelId) {
      try {
        const hotelDoc = await Hotel.findById(hotelId);
        if (hotelDoc) {
          const reqInStr = String(checkInDate).slice(0, 10);
          const reqOutStr = String(checkOutDate).slice(0, 10);
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

          const existingBookings = await Booking.find({
            hotelId: String(hotelId),
            bookingStatus: { $nin: ['CANCELLED'] },
            paymentStatus: { $ne: 'FAILED' },
            $or: [
              { bookingStatus: 'CONFIRMED' },
              { paymentStatus: 'PAID' },
              { bookingStatus: 'PENDING_PAYMENT', createdAt: { $gte: fifteenMinutesAgo } },
            ],
          });

          const bookedCounts = {};
          for (const b of existingBookings) {
            const bInStr = b.checkInDate ? new Date(b.checkInDate).toISOString().slice(0, 10) : '';
            const bOutStr = b.checkOutDate ? new Date(b.checkOutDate).toISOString().slice(0, 10) : '';
            if (bInStr < reqOutStr && bOutStr > reqInStr && Array.isArray(b.bookingDetails)) {
              for (const d of b.bookingDetails) {
                const rtId = d.roomTypeId?.toString();
                if (rtId) bookedCounts[rtId] = (bookedCounts[rtId] || 0) + (Number(d.quantity) || 1);
              }
            }
          }

          for (const item of bookingDetails) {
            const rtId = item.roomTypeId?.toString();
            const roomType = (hotelDoc.roomTypes || []).find((rt) => rt._id.toString() === rtId);
            if (roomType) {
              const total = Number(roomType.totalRooms) || 1;
              const booked = bookedCounts[rtId] || 0;
              const available = Math.max(0, total - booked);
              if (Number(item.quantity) > available) {
                return res.status(400).json({
                  message: `Loại phòng "${roomType.name}" chỉ còn ${available} phòng trống trong khoảng thời gian này.`,
                });
              }
            }
          }
        }
      } catch (checkErr) {
        console.warn('Bo qua kiem tra phong trong:', checkErr.message);
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
      hotelId: hotelId || '',
      hotelName: hotelName || 'Khách Sạn VinaStay',
      hotelAddress: hotelAddress || '',
      bookerInfo: {
        fullName: bookerInfo.fullName.trim(),
        phoneNumber: bookerInfo.phoneNumber.trim(),
        email: bookerInfo.email.trim().toLowerCase(),
      },
      isSelfGuest: Boolean(isSelfGuest),
      guestInfo: isSelfGuest
        ? { fullName: '', phoneNumber: '' }
        : {
          fullName: guestInfo?.fullName?.trim() || '',
          phoneNumber: guestInfo?.phoneNumber?.trim() || '',
        },
      specialRequests: (specialRequests || '').trim(),
      checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
      checkOutDate: checkOutDate ? new Date(checkOutDate) : new Date(Date.now() + 86400000),
      totalNights: Math.max(1, Number(totalNights) || 1),
      totalAdults: Math.max(1, Number(totalAdults) || 1),
      totalChildren: Math.max(0, Number(totalChildren) || 0),
      bookingDetails,
      totalAmount: Number(totalAmount),
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
    const { paymentUrl } = createPaymentUrl({
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
      // Nếu thanh toán thất bại và đã quá 15 phút -> Xóa luôn đơn
      const isExpired = new Date(Date.now() - 15 * 60 * 1000) >= new Date(booking.createdAt);

      if (isExpired) {
        await Booking.deleteOne({ _id: booking._id });
        return res.status(200).json({
          success: false,
          isExpired: true,
          message: 'Giao dịch thanh toán thất bại và đơn phòng đã quá thời hạn 15 phút nên đã được xóa.',
          booking: { ...booking.toObject(), bookingStatus: 'CANCELLED' },
        });
      }

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

    // Chỉ chủ đơn mới được xem
    const isOwner =
      String(booking.customerId) === String(req.user._id) ||
      booking.bookerInfo?.email === req.user.email?.trim().toLowerCase();
    if (!isOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'PENDING_PAYMENT' && booking.paymentStatus !== 'PAID') {
      // Nếu đơn phòng đang ở trạng thái PENDING_PAYMENT nhưng đã quá 15 phút -> Xóa luôn
      const isExpired = new Date(Date.now() - 15 * 60 * 1000) >= new Date(booking.createdAt);

      if (isExpired) {
        await Booking.deleteOne({ _id: booking._id });
        return res.status(404).json({
          message: 'Đơn đặt phòng đã hết hạn thanh toán (quá 15 phút) và đã bị xóa khỏi hệ thống.',
          isExpired: true,
        });
      }
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thông tin đơn đặt phòng', error: error.message });
  }
};

// GET /api/customer/my-bookings
// Lấy danh sách lịch sử đặt phòng của khách hàng
export const getMyBookings = async (req, res) => {
  try {
    // Tự động dọn dẹp các đơn PENDING_PAYMENT quá hạn 15 phút trước khi truy vấn
    await cleanExpiredPendingBookings();

    const customerId = req.user._id;
    const email = req.user.email?.trim().toLowerCase();

    // 1. Lọc theo tài khoản đăng nhập hoặc email người đặt
    let filter = {};
    if (customerId && email) {
      filter = {
        $or: [
          { customerId },
          { 'bookerInfo.email': email }
        ]
      };
    } else if (customerId) {
      filter = { customerId };
    } else if (email) {
      filter = { 'bookerInfo.email': email };
    } else {
      // Nếu chưa đăng nhập và không có email -> trả về rỗng
      return res.status(200).json({ success: true, count: 0, bookings: [] });
    }

    // 2. Lọc theo trạng thái tab nếu có yêu cầu từ client
    const { status, search } = req.query;
    if (status && status !== 'ALL') {
      const now = new Date();
      if (status === 'UPCOMING') {
        filter.bookingStatus = 'CONFIRMED';
        filter.checkInDate = { $gte: now };
      } else if (status === 'PENDING') {
        filter.bookingStatus = 'PENDING_PAYMENT';
      } else if (status === 'COMPLETED') {
        const completedCond = [
          { bookingStatus: 'COMPLETED' },
          { bookingStatus: 'CONFIRMED', checkOutDate: { $lt: now } }
        ];
        if (filter.$or) {
          const userOr = filter.$or;
          delete filter.$or;
          filter.$and = [
            { $or: userOr },
            { $or: completedCond }
          ];
        } else {
          filter.$or = completedCond;
        }
      } else if (status === 'CANCELLED') {
        filter.bookingStatus = 'CANCELLED';
      }
    }

    let bookings = await Booking.find(filter).sort({ createdAt: -1 });

    // 3. Tìm kiếm theo từ khóa nếu có
    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.bookingCode?.toLowerCase().includes(keyword) ||
          b.hotelName?.toLowerCase().includes(keyword)
      );
    }

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử đặt phòng', error: error.message });
  }
};


