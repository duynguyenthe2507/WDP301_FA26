import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';
import Dispute from '../models/Dispute.js';
import RefundRequest from '../models/RefundRequest.js';
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

// VNPAY SANDBOX BOOKING & PAYMENT CONTROLLERS
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
// Ảnh bìa khách sạn: ưu tiên ảnh isCover, không có thì lấy ảnh đầu tiên
const getHotelCover = (hotel) =>
  hotel?.images?.find((img) => img.isCover)?.url || hotel?.images?.[0]?.url || '';

// Lấy IP client
// VNPay chỉ nhận IPv4: bỏ danh sách proxy, tiền tố ::ffff: và đổi ::1 về 127.0.0.1
const getClientIp = (req) => {
  const ip = String(
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '127.0.0.1'
  )
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '');
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : '127.0.0.1';
};

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
      bookingDetails,
      totalAmount,
    } = req.body;

    if (!bookerInfo?.fullName?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập họ và tên người đặt phòng' });
    }
    if (!bookerInfo?.phoneNumber?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại người đặt phòng' });
    }
    if (!bookerInfo?.email?.trim() || !bookerInfo.email.includes('@')) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ' });
    }

    if (!isSelfGuest) {
      if (!guestInfo?.fullName?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập họ và tên khách nhận phòng' });
      }
      if (!guestInfo?.phoneNumber?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập số điện thoại khách nhận phòng' });
      }
    }

    // Thanh toán lại đơn cũ: dùng lại đơn PENDING_PAYMENT thay vì tạo đơn mới
    if (req.body.bookingCode) {
      const existing = await Booking.findOne({
        bookingCode: req.body.bookingCode,
        customerId: req.user._id,
        bookingStatus: 'PENDING_PAYMENT',
      });
      if (!existing || new Date(existing.createdAt).getTime() + 15 * 60 * 1000 <= Date.now()) {
        return res.status(400).json({ message: 'Đơn đặt phòng đã hết hạn thanh toán. Vui lòng đặt lại phòng mới.' });
      }

      existing.bookerInfo = {
        fullName: bookerInfo.fullName.trim(),
        phoneNumber: bookerInfo.phoneNumber.trim(),
        email: bookerInfo.email.trim().toLowerCase(),
      };
      existing.isSelfGuest = Boolean(isSelfGuest);
      existing.guestInfo = isSelfGuest
        ? { fullName: '', phoneNumber: '' }
        : { fullName: guestInfo.fullName.trim(), phoneNumber: guestInfo.phoneNumber.trim() };
      existing.specialRequests = (specialRequests || '').trim();
      existing.paymentStatus = 'UNPAID';
      await existing.save();

      const { paymentUrl } = createPaymentUrl({
        // VNPay không nhận trùng vnp_TxnRef -> thêm hậu tố, verifyReturnData sẽ cắt bỏ
        bookingCode: `${existing.bookingCode}R${Date.now()}`,
        amount: existing.totalAmount,
        ipAddr: getClientIp(req),
        orderInfo: `Thanh toan don dat phong ${existing.bookingCode}`,
      });

      return res.status(200).json({ message: 'Tạo lại giao dịch thanh toán', booking: existing, paymentUrl });
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
      bookingDetails,
      totalAmount: Number(totalAmount),
      bookingStatus: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      paymentMethod: 'VNPAY',
    });

    await newBooking.save();

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

    const { paymentUrl } = createPaymentUrl({
      bookingCode,
      amount: newBooking.totalAmount,
      ipAddr: getClientIp(req),
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

    const isOwner =
      String(booking.customerId) === String(req.user._id) ||
      booking.bookerInfo?.email === req.user.email?.trim().toLowerCase();
    if (!isOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'PENDING_PAYMENT' && booking.paymentStatus !== 'PAID') {
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
export const getMyBookings = async (req, res) => {
  try {
    await cleanExpiredPendingBookings();

    const customerId = req.user._id;
    const email = req.user.email?.trim().toLowerCase();

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
      return res.status(200).json({ success: true, count: 0, bookings: [] });
    }

    const { status, search } = req.query;
    if (status && status !== 'ALL') {
      const now = new Date();
      if (status === 'UPCOMING') {
        filter.bookingStatus = 'CONFIRMED';
        filter.checkInDate = { $gte: now };
      } else if (status === 'PENDING') {
        filter.bookingStatus = 'PENDING_PAYMENT';
      } else if (status === 'COMPLETED') {
        filter.$or = [
          { bookingStatus: 'COMPLETED' },
          { bookingStatus: 'CONFIRMED', checkOutDate: { $lt: now } }
        ];
      } else if (status === 'CANCELLED') {
        filter.bookingStatus = 'CANCELLED';
      }
    }

    let bookings = await Booking.find(filter).sort({ createdAt: -1 });

    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.bookingCode?.toLowerCase().includes(keyword) ||
          b.hotelName?.toLowerCase().includes(keyword)
      );
    }

    // 4. Gắn ảnh bìa của khách sạn trong DB cho từng đơn
    const hotelIds = [...new Set(bookings.map((b) => b.hotelId).filter((id) => mongoose.isValidObjectId(id)))];
    const hotels = await Hotel.find({ _id: { $in: hotelIds } }).select('images').lean();
    const coverById = Object.fromEntries(hotels.map((h) => [h._id.toString(), getHotelCover(h)]));
    const result = bookings.map((b) => ({
      ...b.toObject(),
      hotelImage: coverById[b.hotelId] || b.hotelImage || '',
    }));

    res.status(200).json({
      success: true,
      count: result.length,
      bookings: result,
    });
  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử đặt phòng', error: error.message });
  }
};

const findBookingHotel = async (booking) => {
  const hotelId = String(booking.hotelId || '');
  if (/^[a-f\d]{24}$/i.test(hotelId)) {
    const hotel = await Hotel.findById(hotelId);
    if (hotel) return hotel;
  }
  return Hotel.findOne({ name: booking.hotelName });
};

export const createDispute = async (req, res) => {
  try {
    const { bookingId, category, description, attachments = [] } = req.body;
    const categories = ['INCORRECT_INFORMATION', 'SERVICE_QUALITY', 'OVERCHARGE', 'CANCELLATION', 'OTHER'];
    if (!bookingId || !categories.includes(category) || !description?.trim()) {
      return res.status(400).json({ message: 'Thông tin tranh chấp không hợp lệ.' });
    }
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy booking của bạn.' });
    const disputeDeadline = new Date(booking.checkOutDate || booking.checkInDate).getTime() + 48 * 60 * 60 * 1000;
    if (Date.now() > disputeDeadline) return res.status(400).json({ message: 'Chỉ có thể gửi tranh chấp trong 48 giờ sau khi kết thúc lưu trú.' });
    const hotel = await findBookingHotel(booking);
    if (!hotel?.ownerId) return res.status(400).json({ message: 'Booking chưa có thông tin đối tác để xử lý tranh chấp.' });
    const validAttachments = Array.isArray(attachments)
      ? attachments.filter((file) => file?.fileName && file?.fileUrl).slice(0, 5)
      : [];
    if (category === 'INCORRECT_INFORMATION' && validAttachments.length === 0) {
      return res.status(400).json({ message: 'Tranh chấp sai thông tin khách sạn cần có tối thiểu một bằng chứng.' });
    }
    const existingDispute = await Dispute.exists({
      bookingId: booking._id,
      status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] },
    });
    if (existingDispute) return res.status(409).json({ message: 'Booking này đã có tranh chấp đang được xử lý.' });
    const dispute = await Dispute.create({
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      customerId: req.user._id,
      hotelId: hotel._id,
      partnerId: hotel.ownerId,
      category,
      description: description.trim(),
      attachments: validAttachments,
    });
    res.status(201).json({ message: 'Đã gửi tranh chấp để bộ phận vận hành xem xét.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tạo tranh chấp.', error: error.message });
  }
};

export const createRefundRequest = async (req, res) => {
  try {
    const { bookingId, disputeId, requestedAmount, reason } = req.body;
    const amount = Number(requestedAmount);
    if (!bookingId || !reason?.trim() || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Thông tin yêu cầu hoàn tiền không hợp lệ.' });
    }
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy booking của bạn.' });
    if (booking.paymentStatus !== 'PAID') return res.status(400).json({ message: 'Chỉ booking đã thanh toán mới có thể yêu cầu hoàn tiền.' });
    const existingRefund = await RefundRequest.exists({
      bookingId: booking._id,
      status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSED'] },
    });
    if (existingRefund) return res.status(409).json({ message: 'Booking này đã có yêu cầu hoàn tiền đang được xử lý hoặc đã hoàn.' });
    if (amount > Number(booking.totalAmount || 0)) return res.status(400).json({ message: 'Số tiền yêu cầu không được vượt quá giá trị booking.' });
    const hotel = await findBookingHotel(booking);
    if (!hotel?.ownerId) return res.status(400).json({ message: 'Booking chưa có thông tin đối tác để xử lý hoàn tiền.' });
    if (disputeId) {
      const dispute = await Dispute.findOne({ _id: disputeId, bookingId: booking._id, customerId: req.user._id });
      if (!dispute) return res.status(400).json({ message: 'Tranh chấp liên kết không hợp lệ.' });
    }
    const refund = await RefundRequest.create({
      bookingId: booking._id,
      disputeId: disputeId || null,
      customerId: req.user._id,
      hotelId: hotel._id,
      partnerId: hotel.ownerId,
      requestedAmount: amount,
      reason: reason.trim(),
    });
    res.status(201).json({ message: 'Đã gửi yêu cầu hoàn tiền để xem xét.', refund });
  } catch (error) {
    res.status(500).json({ message: 'Không thể tạo yêu cầu hoàn tiền.', error: error.message });
  }
};


// HỦY ĐẶT PHÒNG & TÍNH TOÁN HOÀN TIỀN
// Hàm tính toán chi tiết chính sách hủy, hạn hủy và số tiền hoàn
export const calculateCancellationDetails = (booking, hotel) => {
  const policy = hotel?.cancellationPolicy || booking.cancellationPolicySnapshot || 'three';
  const totalAmount = Number(booking.totalAmount) || 0;
  const totalNights = Math.max(1, Number(booking.totalNights) || 1);
  const checkInDate = booking.checkInDate ? new Date(booking.checkInDate) : new Date();

  // Tính giá của đêm đầu tiên
  let firstNightCost = 0;
  if (Array.isArray(booking.bookingDetails) && booking.bookingDetails.length > 0) {
    firstNightCost = booking.bookingDetails.reduce(
      (sum, d) => sum + (Number(d.pricePerNight) || 0) * (Number(d.quantity) || 1),
      0
    );
  }
  if (!firstNightCost || firstNightCost <= 0) {
    firstNightCost = Math.round(totalAmount / totalNights);
  }
  firstNightCost = Math.min(firstNightCost, totalAmount);

  // Xác định số ngày miễn phí hủy trước ngày nhận phòng (chuẩn mốc 14:00)
  let daysBefore = 3;
  let isNonRefundable = false;

  const policyLower = String(policy).toLowerCase();
  if (policyLower === 'none' || policyLower.includes('không hoàn') || policyLower.includes('non-refundable')) {
    isNonRefundable = true;
    daysBefore = null;
  } else if (policyLower === 'one' || policyLower.includes('24h') || policyLower.includes('1 ngày')) {
    daysBefore = 1;
  } else if (policyLower === 'two' || policyLower.includes('48h') || policyLower.includes('2 ngày')) {
    daysBefore = 2;
  } else {
    daysBefore = 3; // Mặc định 'three' (72h)
  }

  let deadlineDate = null;
  let isFreeCancel = false;
  const now = new Date();

  if (!isNonRefundable && daysBefore !== null) {
    // Thời điểm 14:00 của (checkInDate - daysBefore ngày)
    deadlineDate = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth(),
      checkInDate.getDate() - daysBefore,
      14,
      0,
      0
    );
    isFreeCancel = now.getTime() <= deadlineDate.getTime();
  }

  let cancellationFee = 0;
  let refundAmount = 0;

  if (booking.paymentStatus !== 'PAID') {
    cancellationFee = 0;
    refundAmount = 0;
  } else if (isFreeCancel) {
    cancellationFee = 0;
    refundAmount = totalAmount;
  } else {
    if (isNonRefundable) {
      cancellationFee = totalAmount;
      refundAmount = 0;
    } else {
      cancellationFee = firstNightCost;
      refundAmount = Math.max(0, totalAmount - cancellationFee);
    }
  }

  const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  const formatDeadline = (date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} ngày ${day}/${month}/${year}`;
  };

  const formatCurrentDay = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const hotelName = hotel?.name || booking.hotelName || 'Khách sạn';
  const todayStr = formatCurrentDay(now);

  let policyDescription = '';
  let statusBanner = '';

  if (isNonRefundable) {
    policyDescription = `Đặt phòng này không được hoàn hủy theo chính sách của ${hotelName} tại thời điểm đặt.`;
    statusBanner = `Đơn đặt phòng này áp dụng chính sách không hoàn tiền.`;
  } else {
    const deadlineStr = formatDeadline(deadlineDate);
    policyDescription = `Miễn phí hủy trước ${deadlineStr}. Từ thời điểm này, phí hủy bằng đêm đầu tiên: ${formatMoney(
      firstNightCost
    )}. Chính sách của ${hotelName} tại thời điểm đặt.`;

    if (isFreeCancel) {
      statusBanner = `Yêu cầu hủy ngày ${todayStr} nằm trong thời gian miễn phí hủy của đặt phòng này.`;
    } else {
      statusBanner = `Yêu cầu hủy ngày ${todayStr} đã quá thời gian miễn phí hủy của đặt phòng này.`;
    }
  }

  return {
    policy,
    isNonRefundable,
    daysBefore,
    deadlineDate,
    deadlineStr: deadlineDate ? formatDeadline(deadlineDate) : null,
    isFreeCancel,
    paidAmount: booking.paymentStatus === 'PAID' ? totalAmount : 0,
    cancellationFee,
    refundAmount,
    firstNightCost,
    policyDescription,
    statusBanner,
    todayStr,
  };
};

// GET /api/customer/bookings/:idOrCode/cancel-info
export const getCancelBookingInfo = async (req, res) => {
  try {
    const { idOrCode } = req.params;
    let booking = null;

    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      booking = await Booking.findById(idOrCode);
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingCode: idOrCode });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }

    // Kiểm tra quyền sở hữu đơn (chủ đơn hoặc ADMIN)
    const isOwner =
      req.user.role === 'ADMIN' ||
      (booking.customerId && String(booking.customerId) === String(req.user._id)) ||
      (booking.bookerInfo?.email &&
        booking.bookerInfo.email.trim().toLowerCase() === req.user.email?.trim().toLowerCase());
    if (!isOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền thao tác với đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({
        message: 'Đơn đặt phòng này đã được hủy trước đó',
        isCancelled: true,
        booking,
      });
    }
    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'Đơn đặt phòng đã hoàn thành, không thể hủy' });
    }

    // Lấy thông tin khách sạn
    let hotel = null;
    if (booking.hotelId) {
      if (mongoose.Types.ObjectId.isValid(booking.hotelId)) {
        hotel = await Hotel.findById(booking.hotelId);
      }
      if (!hotel) {
        hotel = await Hotel.findOne({ name: booking.hotelName });
      }
    }

    const calculations = calculateCancellationDetails(booking, hotel);

    // Xử lý thông tin chi tiết loại phòng (tên phòng, diện tích, loại giường)
    let roomDetailsInfo = '';
    if (hotel && Array.isArray(hotel.roomTypes) && booking.bookingDetails?.[0]?.roomTypeId) {
      const room = hotel.roomTypes.find(
        (r) => String(r._id) === String(booking.bookingDetails[0].roomTypeId)
      );
      if (room) {
        const parts = [room.name];
        if (room.roomSize) parts.push(`${room.roomSize} m²`);
        if (room.bedType) parts.push(room.bedType);
        roomDetailsInfo = parts.join(' · ');
      }
    }
    if (!roomDetailsInfo && booking.bookingDetails?.[0]?.roomTypeName) {
      roomDetailsInfo = booking.bookingDetails[0].roomTypeName;
    }

    const hotelThumbnail = getHotelCover(hotel) || booking.hotelImage || '';
    const hotelStars = hotel?.starRating || 4;
    const hotelAddress = hotel?.address || booking.hotelAddress || '';
    const hotelName = hotel?.name || booking.hotelName || '';

    res.status(200).json({
      success: true,
      booking,
      hotelInfo: {
        name: hotelName,
        address: hotelAddress,
        starRating: hotelStars,
        thumbnail: hotelThumbnail,
        roomDetailsInfo,
      },
      calculations,
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin hủy đặt phòng:', error);
    res.status(500).json({ message: 'Lỗi khi lấy thông tin hủy đặt phòng', error: error.message });
  }
};

// POST /api/customer/bookings/:idOrCode/cancel
export const cancelBooking = async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const { reason, note } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Vui lòng chọn lý do hủy đặt phòng' });
    }

    let booking = null;
    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      booking = await Booking.findById(idOrCode);
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingCode: idOrCode });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }

    // Kiểm tra quyền sở hữu đơn (chủ đơn hoặc ADMIN)
    const isOwner =
      req.user.role === 'ADMIN' ||
      (booking.customerId && String(booking.customerId) === String(req.user._id)) ||
      (booking.bookerInfo?.email &&
        booking.bookerInfo.email.trim().toLowerCase() === req.user.email?.trim().toLowerCase());
    if (!isOwner) {
      return res.status(403).json({ message: 'Bạn không có quyền hủy đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ message: 'Đơn đặt phòng này đã được hủy trước đó' });
    }
    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'Đơn đặt phòng đã hoàn thành, không thể hủy' });
    }

    // Lấy khách sạn để tính toán phí hủy và tiền hoàn chính xác
    let hotel = null;
    if (booking.hotelId) {
      if (mongoose.Types.ObjectId.isValid(booking.hotelId)) {
        hotel = await Hotel.findById(booking.hotelId);
      }
      if (!hotel) {
        hotel = await Hotel.findOne({ name: booking.hotelName });
      }
    }

    const calculations = calculateCancellationDetails(booking, hotel);

    booking.bookingStatus = 'CANCELLED';
    booking.cancellationReason = reason.trim();
    booking.cancellationNote = (note || '').trim();
    booking.cancelledAt = new Date();
    booking.cancellationFee = calculations.cancellationFee;
    booking.refundAmount = calculations.refundAmount;
    booking.cancellationPolicySnapshot = calculations.policyDescription;

    if (booking.paymentStatus === 'PAID' && calculations.refundAmount > 0) {
      booking.refundStatus = 'PENDING';
    } else {
      booking.refundStatus = 'NOT_APPLICABLE';
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Hủy đặt phòng thành công!',
      booking,
      calculations,
    });
  } catch (error) {
    console.error('Lỗi khi hủy đặt phòng:', error);
    res.status(500).json({ message: 'Lỗi khi hủy đặt phòng', error: error.message });
  }
};


