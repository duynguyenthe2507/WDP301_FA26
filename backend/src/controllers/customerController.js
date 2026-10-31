import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import BookingDetail from '../models/BookingDetail.js';
import BookingCancellation from '../models/BookingCancellation.js';
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
    if (new_password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
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

// vnp_PayDate dạng yyyyMMddHHmmss (GMT+7) -> Date
const parseVnpDate = (str) => {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(str || '');
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`) : new Date();
};

// Các quan hệ đính kèm khi trả booking về frontend
const BOOKING_POPULATE = [
  'details',
  'cancellation',
  'payment',
  { path: 'hotel', select: 'name address images cancellationPolicy' },
];

const isBookingOwner = (booking, user) =>
  String(booking.customerId) === String(user._id) ||
  booking.bookerEmail === user.email?.trim().toLowerCase();

// Mỗi lần thanh toán là một Payment PENDING với txnRef riêng (VNPay không nhận trùng vnp_TxnRef;
// verifyReturnData cắt hậu tố R<timestamp> để ra lại bookingCode)
const startPayment = async (booking, req) => {
  const txnRef = `${booking.bookingCode}R${Date.now()}`;
  await Payment.create({ bookingId: booking._id, txnRef, amount: booking.totalAmount });
  return createPaymentUrl({
    bookingCode: txnRef,
    amount: booking.totalAmount,
    ipAddr: getClientIp(req),
    orderInfo: `Thanh toan don dat phong ${booking.bookingCode}`,
  }).paymentUrl;
};

export const createPendingBooking = async (req, res) => {
  try {
    const {
      hotelId,
      bookerFullName,
      bookerPhone,
      bookerEmail,
      isSelfGuest,
      guestFullName,
      guestPhone,
      specialRequests,
      checkInDate,
      checkOutDate,
      totalNights,
      adultsCount,
      childrenCount,
      bookingDetails,
      totalAmount,
    } = req.body;

    if (!bookerFullName?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập họ và tên người đặt phòng' });
    }
    if (!bookerPhone?.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại người đặt phòng' });
    }
    if (!bookerEmail?.trim() || !bookerEmail.includes('@')) {
      return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ' });
    }

    if (!isSelfGuest) {
      if (!guestFullName?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập họ và tên khách nhận phòng' });
      }
      if (!guestPhone?.trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập số điện thoại khách nhận phòng' });
      }
    }

    const bookerFields = {
      bookerFullName: bookerFullName.trim(),
      bookerPhone: bookerPhone.trim(),
      bookerEmail: bookerEmail.trim().toLowerCase(),
      isSelfGuest: Boolean(isSelfGuest),
      guestFullName: isSelfGuest ? '' : guestFullName.trim(),
      guestPhone: isSelfGuest ? '' : guestPhone.trim(),
    };

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

      Object.assign(existing, bookerFields, {
        paymentStatus: 'UNPAID',
        specialRequests: (specialRequests || '').trim(),
      });
      await existing.save();

      const paymentUrl = await startPayment(existing, req);

      return res.status(200).json({ message: 'Tạo lại giao dịch thanh toán', booking: await existing.populate(BOOKING_POPULATE), paymentUrl });
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
    if (!mongoose.isValidObjectId(hotelId)) {
      return res.status(400).json({ message: 'Khách sạn không hợp lệ' });
    }
    // Kiem tra so phong con trong truoc khi tao don
    const hotelDoc = await Hotel.findById(hotelId).populate('roomTypes');
    if (!hotelDoc) {
      return res.status(404).json({ message: 'Không tìm thấy khách sạn' });
    }
    // Lỗi trong lúc kiểm tra phòng trống không chặn việc đặt phòng (chỉ log cảnh báo ở catch bên dưới)
    try {
      if (hotelDoc) {
        const reqInStr = String(checkInDate).slice(0, 10);
        const reqOutStr = String(checkOutDate).slice(0, 10);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        // Các đơn đang chiếm phòng của khách sạn: đã xác nhận, đã thanh toán,
        // hoặc đang chờ thanh toán nhưng chưa quá 15 phút giữ chỗ (đơn hủy / thanh toán lỗi thì không tính)
        const existingBookings = await Booking.find({
          hotelId: String(hotelId),
          bookingStatus: { $nin: ['CANCELLED'] },
          paymentStatus: { $ne: 'FAILED' },
          $or: [
            { bookingStatus: 'CONFIRMED' },
            { paymentStatus: 'PAID' },
            { bookingStatus: 'PENDING_PAYMENT', createdAt: { $gte: fifteenMinutesAgo } },
          ],
        }).populate('details');

        // Đếm số phòng đã bị đặt theo từng loại phòng, chỉ tính các đơn trùng khoảng ngày
        // (trùng khi: nhận phòng cũ < trả phòng mới và trả phòng cũ > nhận phòng mới)
        const bookedCounts = {};
        for (const b of existingBookings) {
          const bInStr = b.checkInDate ? new Date(b.checkInDate).toISOString().slice(0, 10) : '';
          const bOutStr = b.checkOutDate ? new Date(b.checkOutDate).toISOString().slice(0, 10) : '';
          if (bInStr < reqOutStr && bOutStr > reqInStr && Array.isArray(b.details)) {
            for (const d of b.details) {
              const rtId = d.roomTypeId?.toString();
              if (rtId) bookedCounts[rtId] = (bookedCounts[rtId] || 0) + (Number(d.quantity) || 1);
            }
          }
        }

        // So sánh số phòng khách chọn với số phòng còn trống (tổng phòng - đã đặt) của từng loại phòng
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

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `VNS${dateStr}${randomSuffix}`;

    const newBooking = await Booking.create({
      bookingCode,
      customerId: req.user._id,
      hotelId,
      hotelName: hotelDoc.name,
      hotelAddress: hotelDoc.address,
      ...bookerFields,
      specialRequests: (specialRequests || '').trim(),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalNights: Math.max(1, Number(totalNights) || 1),
      adultsCount: Math.max(1, Number(adultsCount) || 1),
      childrenCount: Math.max(0, Number(childrenCount) || 0),
      totalAmount: Number(totalAmount),
    });

    await BookingDetail.insertMany(
      bookingDetails.map(({ roomTypeId, roomTypeName, quantity, pricePerNight, totalPrice }) => ({
        bookingId: newBooking._id,
        roomTypeId,
        roomTypeName,
        quantity,
        pricePerNight,
        totalPrice,
      }))
    );

    const paymentUrl = await startPayment(newBooking, req);

    res.status(201).json({
      message: 'Tạo đơn đặt phòng thành công, chuyển hướng đến VNPay Sandbox',
      booking: await newBooking.populate(BOOKING_POPULATE),
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
          payment: {
            txnRef: bookingCode,
            transactionNo: transactionNo || '',
            bankCode: bankCode || '',
            responseCode: responseCode || (isSuccess ? '00' : '24'),
          },
        },
      });
    }

    // Return URL có thể được gọi lại (GET + POST): đơn đã thanh toán thì không ghi đè
    if (booking.paymentStatus === 'PAID') {
      return res.status(200).json({ success: true, message: 'Thanh toán VNPay thành công!', booking: await booking.populate(BOOKING_POPULATE) });
    }

    const txnRef = String(vnpParams.vnp_TxnRef || '');
    const recordPayment = (status) =>
      Payment.findOneAndUpdate(
        { txnRef },
        {
          bookingId: booking._id,
          amount: booking.totalAmount,
          status,
          transactionNo: transactionNo || '',
          bankCode: bankCode || '',
          cardType: cardType || '',
          responseCode: responseCode || '',
          payDate: status === 'SUCCESS' ? parseVnpDate(payDate) : null,
        },
        { upsert: true }
      );

    if (isSuccess) {
      await recordPayment('SUCCESS');
      booking.bookingStatus = 'CONFIRMED';
      booking.paymentStatus = 'PAID';
      await booking.save();

      return res.status(200).json({
        success: true,
        message: 'Thanh toán VNPay thành công!',
        booking: await booking.populate(BOOKING_POPULATE),
      });
    }

    await recordPayment('FAILED');
    const isExpired = new Date(Date.now() - 15 * 60 * 1000) >= new Date(booking.createdAt);

    if (isExpired) {
      await Booking.deleteOne({ _id: booking._id });
      return res.status(200).json({
        success: false,
        isExpired: true,
        message: 'Giao dịch thanh toán thất bại và đơn phòng đã quá thời hạn 15 phút nên đã được xóa.',
        booking: { ...(await booking.populate(BOOKING_POPULATE)).toObject(), bookingStatus: 'CANCELLED' },
      });
    }

    booking.paymentStatus = 'FAILED';
    await booking.save();

    return res.status(200).json({
      success: false,
      message: 'Giao dịch thanh toán không thành công hoặc người dùng đã hủy giao dịch',
      booking: await booking.populate(BOOKING_POPULATE),
    });
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

    if (!isBookingOwner(booking, req.user)) {
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

    res.status(200).json({ booking: await booking.populate(BOOKING_POPULATE) });
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

    const filter = { $or: [{ customerId }, { bookerEmail: email }] };

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

    let bookings = await Booking.find(filter).sort({ createdAt: -1 }).populate(BOOKING_POPULATE);

    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      bookings = bookings.filter(
        (b) => b.bookingCode.toLowerCase().includes(keyword) || b.hotelName.toLowerCase().includes(keyword)
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
    const hotel = await Hotel.findById(booking.hotelId);
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
    const hotel = await Hotel.findById(booking.hotelId);
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
// Hạn hoàn tiền theo chính sách khách sạn (tính đến 14:00 của ngày nhận phòng trừ N ngày):
// hủy trong hạn thì hoàn 100%, hủy sau hạn thì mất toàn bộ; 'none' = không hoàn tiền
const REFUND_TIERS = {
  one: [{ days: 1, rate: 1 }],
  three: [{ days: 3, rate: 1 }],
  none: [],
};

export const calculateCancellationDetails = (booking, hotel) => {
  const policy = REFUND_TIERS[hotel?.cancellationPolicy] ? hotel.cancellationPolicy : 'three';
  const tiers = REFUND_TIERS[policy];
  const totalAmount = Number(booking.totalAmount) || 0;
  const checkInDate = booking.checkInDate ? new Date(booking.checkInDate) : new Date();
  const now = new Date();

  const deadlineOf = (days) =>
    new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate() - days, 14, 0, 0);

  // Mốc đầu tiên mà thời điểm hủy còn nằm trong hạn quyết định tỉ lệ hoàn
  const tier = tiers.find((t) => now.getTime() <= deadlineOf(t.days).getTime());
  const refundRate = tier ? tier.rate : 0;
  const isPaid = booking.paymentStatus === 'PAID';

  const refundAmount = isPaid ? Math.round(totalAmount * refundRate) : 0;
  const cancellationFee = isPaid ? totalAmount - refundAmount : 0;

  const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  const pad = (n) => String(n).padStart(2, '0');
  const formatDeadline = (d) => `14:00 ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const hotelName = hotel?.name || 'Khách sạn';

  let policyDescription;
  if (policy === 'none') {
    policyDescription = `Đặt phòng này không được hoàn hủy theo chính sách của ${hotelName} tại thời điểm đặt.`;
  } else {
    const parts = tiers.map(
      (t) => `hoàn ${Math.round(t.rate * 100)}% nếu hủy trước ${formatDeadline(deadlineOf(t.days))}`
    );
    policyDescription = `${parts.join('; ')}; sau đó không hoàn tiền. Chính sách của ${hotelName} tại thời điểm đặt.`;
  }

  const statusBanner =
    policy === 'none'
      ? 'Đơn đặt phòng này áp dụng chính sách không hoàn tiền.'
      : refundRate === 1
        ? `Yêu cầu hủy ngày ${todayStr} nằm trong thời gian miễn phí hủy của đặt phòng này.`
        : refundRate > 0
          ? `Yêu cầu hủy ngày ${todayStr} được hoàn ${Math.round(refundRate * 100)}% giá trị đặt phòng.`
          : `Yêu cầu hủy ngày ${todayStr} đã quá thời gian được hoàn tiền của đặt phòng này.`;

  return {
    policy,
    isNonRefundable: policy === 'none',
    refundRate,
    isFreeCancel: refundRate === 1,
    deadlineStr: tiers[0] ? formatDeadline(deadlineOf(tiers[0].days)) : null,
    paidAmount: isPaid ? totalAmount : 0,
    cancellationFee,
    refundAmount,
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
      booking = await Booking.findById(idOrCode).populate('details');
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingCode: idOrCode }).populate('details');
    }

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }

    // Kiểm tra quyền sở hữu đơn (chủ đơn hoặc ADMIN)
    if (req.user.role !== 'ADMIN' && !isBookingOwner(booking, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền thao tác với đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({
        message: 'Đơn đặt phòng này đã được hủy trước đó',
        isCancelled: true,
        booking: await booking.populate(BOOKING_POPULATE),
      });
    }
    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'Đơn đặt phòng đã hoàn thành, không thể hủy' });
    }

    // Lấy thông tin khách sạn
    const hotel = await Hotel.findById(booking.hotelId).populate('roomTypes');

    const calculations = calculateCancellationDetails(booking, hotel);

    // Xử lý thông tin chi tiết loại phòng (tên phòng, diện tích, loại giường)
    let roomDetailsInfo = '';
    if (hotel && Array.isArray(hotel.roomTypes) && booking.details?.[0]?.roomTypeId) {
      const room = hotel.roomTypes.find(
        (r) => String(r._id) === String(booking.details[0].roomTypeId)
      );
      if (room) {
        const parts = [room.name];
        if (room.roomSize) parts.push(`${room.roomSize} m²`);
        if (room.bedType) parts.push(room.bedType);
        roomDetailsInfo = parts.join(' · ');
      }
    }
    if (!roomDetailsInfo && booking.details?.[0]?.roomTypeName) {
      roomDetailsInfo = booking.details[0].roomTypeName;
    }

    res.status(200).json({
      success: true,
      booking: await booking.populate(BOOKING_POPULATE),
      hotelInfo: {
        name: hotel?.name || '',
        address: hotel?.address || '',
        starRating: hotel?.starRating || 4,
        thumbnail: getHotelCover(hotel),
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
      booking = await Booking.findById(idOrCode).populate('details');
    }
    if (!booking) {
      booking = await Booking.findOne({ bookingCode: idOrCode }).populate('details');
    }

    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đơn đặt phòng' });
    }

    // Kiểm tra quyền sở hữu đơn (chủ đơn hoặc ADMIN)
    if (req.user.role !== 'ADMIN' && !isBookingOwner(booking, req.user)) {
      return res.status(403).json({ message: 'Bạn không có quyền hủy đơn đặt phòng này' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ message: 'Đơn đặt phòng này đã được hủy trước đó' });
    }
    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'Đơn đặt phòng đã hoàn thành, không thể hủy' });
    }

    // Lấy khách sạn để tính toán phí hủy và tiền hoàn chính xác
    const hotel = await Hotel.findById(booking.hotelId);

    const calculations = calculateCancellationDetails(booking, hotel);

    booking.bookingStatus = 'CANCELLED';
    await booking.save();
    await BookingCancellation.create({
      bookingId: booking._id,
      reason: reason.trim(),
      note: (note || '').trim(),
      cancellationFee: calculations.cancellationFee,
      refundAmount: calculations.refundAmount,
      refundStatus: booking.paymentStatus === 'PAID' && calculations.refundAmount > 0 ? 'PENDING' : 'NOT_APPLICABLE',
    });
    await booking.populate('cancellation');

    res.status(200).json({
      success: true,
      message: 'Hủy đặt phòng thành công!',
      booking: await booking.populate(BOOKING_POPULATE),
      calculations,
    });
  } catch (error) {
    console.error('Lỗi khi hủy đặt phòng:', error);
    res.status(500).json({ message: 'Lỗi khi hủy đặt phòng', error: error.message });
  }
};


