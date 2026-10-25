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
    if (!user) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lá»—i há»‡ thá»‘ng', error: error.message });
  }
};

// PUT /api/customer/profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, avatarUrl } = req.body;
    const updateData = {};

    if (fullName !== undefined) {
      if (fullName.trim().length < 2)
        return res.status(400).json({ message: 'Há» tÃªn pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±' });
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
      message: 'Cáº­p nháº­t thÃ nh cÃ´ng',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lá»—i há»‡ thá»‘ng', error: error.message });
  }
};

// PUT /api/customer/change-password
export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password)
      return res.status(400).json({ message: 'Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin' });
    if (new_password.length < 8)
      return res.status(400).json({ message: 'Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±' });
    if (new_password !== confirm_password)
      return res.status(400).json({ message: 'XÃ¡c nháº­n máº­t kháº©u khÃ´ng khá»›p' });

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch)
      return res.status(401).json({ message: 'Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Ãºng' });

    user.password = new_password;
    await user.save(); // trigger pre-save hook Ä‘á»ƒ hash password má»›i

    res.status(200).json({ message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng' });
  } catch (error) {
    res.status(500).json({ message: 'Lá»—i há»‡ thá»‘ng', error: error.message });
  }
};

// ==========================================
// VNPAY SANDBOX BOOKING & PAYMENT CONTROLLERS
// ==========================================

// Tá»± Ä‘á»™ng xÃ³a cÃ¡c Ä‘Æ¡n Ä‘áº·t phÃ²ng á»Ÿ tráº¡ng thÃ¡i chá» thanh toÃ¡n quÃ¡ 15 phÃºt
export const cleanExpiredPendingBookings = async () => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const deleteResult = await Booking.deleteMany({
      bookingStatus: 'PENDING_PAYMENT',
      paymentStatus: { $ne: 'PAID' },
      createdAt: { $lte: fifteenMinutesAgo },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`[Auto-Clean] ÄÃ£ tá»± Ä‘á»™ng xÃ³a ${deleteResult.deletedCount} Ä‘Æ¡n phÃ²ng PENDING_PAYMENT quÃ¡ háº¡n 15 phÃºt.`);
    }
  } catch (error) {
    console.error('Lá»—i khi tá»± Ä‘á»™ng dá»n dáº¹p Ä‘Æ¡n phÃ²ng quÃ¡ háº¡n:', error.message);
  }
};

// POST /api/customer/bookings/pending
// Táº¡o Ä‘Æ¡n Ä‘áº·t phÃ²ng vÃ  sinh link chuyá»ƒn hÆ°á»›ng sang VNPay Sandbox
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

    // Kiá»ƒm tra thÃ´ng tin ngÆ°á»i Ä‘áº·t
    if (!bookerInfo?.fullName?.trim()) {
      return res.status(400).json({ message: 'Vui lÃ²ng nháº­p há» vÃ  tÃªn ngÆ°á»i Ä‘áº·t phÃ²ng' });
    }
    if (!bookerInfo?.phoneNumber?.trim()) {
      return res.status(400).json({ message: 'Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i ngÆ°á»i Ä‘áº·t phÃ²ng' });
    }
    if (!bookerInfo?.email?.trim() || !bookerInfo.email.includes('@')) {
      return res.status(400).json({ message: 'Vui lÃ²ng nháº­p Ä‘á»‹a chá»‰ email há»£p lá»‡' });
    }

    // Náº¿u Ä‘áº·t cho ngÆ°á»i khÃ¡c: kiá»ƒm tra thÃ´ng tin khÃ¡ch nháº­n phÃ²ng
    if (!isSelfGuest) {
      if (!guestInfo?.fullName?.trim()) {
        return res.status(400).json({ message: 'Vui lÃ²ng nháº­p há» vÃ  tÃªn khÃ¡ch nháº­n phÃ²ng' });
      }
      if (!guestInfo?.phoneNumber?.trim()) {
        return res.status(400).json({ message: 'Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i khÃ¡ch nháº­n phÃ²ng' });
      }
    }

    // Validate ngÃ y nháº­n vÃ  tráº£ phÃ²ng
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Vui lÃ²ng chá»n ngÃ y nháº­n phÃ²ng vÃ  ngÃ y tráº£ phÃ²ng' });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ message: 'Äá»‹nh dáº¡ng ngÃ y nháº­n/tráº£ phÃ²ng khÃ´ng há»£p lá»‡' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInStart = new Date(checkIn);
    checkInStart.setHours(0, 0, 0, 0);

    if (checkInStart < today) {
      return res.status(400).json({ message: 'NgÃ y nháº­n phÃ²ng khÃ´ng Ä‘Æ°á»£c á»Ÿ trong quÃ¡ khá»©' });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({ message: 'NgÃ y tráº£ phÃ²ng pháº£i sau ngÃ y nháº­n phÃ²ng Ã­t nháº¥t 1 ngÃ y' });
    }

    // Validate sá»‘ lÆ°á»£ng phÃ²ng Ä‘áº·t
    if (!bookingDetails || !Array.isArray(bookingDetails) || bookingDetails.length === 0) {
      return res.status(400).json({ message: 'Vui lÃ²ng chá»n Ã­t nháº¥t 1 loáº¡i phÃ²ng Ä‘á»ƒ Ä‘áº·t' });
    }

    const hasInvalidRoom = bookingDetails.some((item) => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidRoom) {
      return res.status(400).json({ message: 'Sá»‘ lÆ°á»£ng phÃ²ng Ä‘áº·t khÃ´ng há»£p lá»‡' });
    }

    if (!Number(totalAmount) || Number(totalAmount) < 10000) {
      return res.status(400).json({ message: 'Tá»•ng tiá»n Ä‘áº·t phÃ²ng khÃ´ng há»£p lá»‡' });
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
                  message: `Loáº¡i phÃ²ng "${roomType.name}" chá»‰ cÃ²n ${available} phÃ²ng trá»‘ng trong khoáº£ng thá»i gian nÃ y.`,
                });
              }
            }
          }
        }
      } catch (checkErr) {
        console.warn('Bo qua kiem tra phong trong:', checkErr.message);
      }
    }

    // Sinh mÃ£ Ä‘áº·t phÃ²ng duy nháº¥t: VNS + YYYYMMDD + 4 sá»‘ ngáº«u nhiÃªn
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `VNS${dateStr}${randomSuffix}`;

    const newBooking = new Booking({
      bookingCode,
      customerId: req.user?._id || null,
      hotelId: hotelId || '',
      hotelName: hotelName || 'KhÃ¡ch Sáº¡n VinaStay',
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

    // Láº¥y IP client
    // VNPay chá»‰ nháº­n IPv4: bá» danh sÃ¡ch proxy, tiá»n tá»‘ ::ffff: vÃ  Ä‘á»•i ::1 vá» 127.0.0.1
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

    // Táº¡o URL thanh toÃ¡n VNPay Sandbox
    const { paymentUrl } = createPaymentUrl({
      bookingCode,
      amount: newBooking.totalAmount,
      ipAddr,
      orderInfo: `Thanh toan don dat phong ${bookingCode}`,
    });

    res.status(201).json({
      message: 'Táº¡o Ä‘Æ¡n Ä‘áº·t phÃ²ng thÃ nh cÃ´ng, chuyá»ƒn hÆ°á»›ng Ä‘áº¿n VNPay Sandbox',
      booking: newBooking,
      paymentUrl,
    });
  } catch (error) {
    console.error('Error creating pending booking:', error);
    res.status(500).json({ message: 'Lá»—i há»‡ thá»‘ng khi táº¡o Ä‘Æ¡n Ä‘áº·t phÃ²ng', error: error.message });
  }
};

// GET & POST /api/customer/bookings/vnpay-verify
// XÃ¡c thá»±c káº¿t quáº£ giao dá»‹ch thanh toÃ¡n tá»« VNPay Sandbox
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
        message: isSuccess ? 'Thanh toÃ¡n thÃ nh cÃ´ng' : 'Thanh toÃ¡n tháº¥t báº¡i',
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
        message: 'Thanh toÃ¡n VNPay thÃ nh cÃ´ng!',
        booking,
      });
    } else {
      // Náº¿u thanh toÃ¡n tháº¥t báº¡i vÃ  Ä‘Ã£ quÃ¡ 15 phÃºt -> XÃ³a luÃ´n Ä‘Æ¡n
      const isExpired = new Date(Date.now() - 15 * 60 * 1000) >= new Date(booking.createdAt);

      if (isExpired) {
        await Booking.deleteOne({ _id: booking._id });
        return res.status(200).json({
          success: false,
          isExpired: true,
          message: 'Giao dá»‹ch thanh toÃ¡n tháº¥t báº¡i vÃ  Ä‘Æ¡n phÃ²ng Ä‘Ã£ quÃ¡ thá»i háº¡n 15 phÃºt nÃªn Ä‘Ã£ Ä‘Æ°á»£c xÃ³a.',
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
        message: 'Giao dá»‹ch thanh toÃ¡n khÃ´ng thÃ nh cÃ´ng hoáº·c ngÆ°á»i dÃ¹ng Ä‘Ã£ há»§y giao dá»‹ch',
        booking,
      });
    }
  } catch (error) {
    console.error('Error verifying VNPay payment:', error);
    res.status(500).json({ success: false, message: 'Lá»—i xÃ¡c thá»±c thanh toÃ¡n VNPay', error: error.message });
  }
};

// GET /api/customer/bookings/:bookingCode
export const getBookingByCode = async (req, res) => {
  try {
    const { bookingCode } = req.params;
    const booking = await Booking.findOne({ bookingCode });
    if (!booking) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin Ä‘Æ¡n Ä‘áº·t phÃ²ng' });
    }

    // Chá»‰ chá»§ Ä‘Æ¡n má»›i Ä‘Æ°á»£c xem
    const isOwner =
      String(booking.customerId) === String(req.user._id) ||
      booking.bookerInfo?.email === req.user.email?.trim().toLowerCase();
    if (!isOwner) {
      return res.status(403).json({ message: 'Báº¡n khÃ´ng cÃ³ quyá»n xem Ä‘Æ¡n Ä‘áº·t phÃ²ng nÃ y' });
    }

    if (booking.bookingStatus === 'PENDING_PAYMENT' && booking.paymentStatus !== 'PAID') {
      // Náº¿u Ä‘Æ¡n phÃ²ng Ä‘ang á»Ÿ tráº¡ng thÃ¡i PENDING_PAYMENT nhÆ°ng Ä‘Ã£ quÃ¡ 15 phÃºt -> XÃ³a luÃ´n
      const isExpired = new Date(Date.now() - 15 * 60 * 1000) >= new Date(booking.createdAt);

      if (isExpired) {
        await Booking.deleteOne({ _id: booking._id });
        return res.status(404).json({
          message: 'ÄÆ¡n Ä‘áº·t phÃ²ng Ä‘Ã£ háº¿t háº¡n thanh toÃ¡n (quÃ¡ 15 phÃºt) vÃ  Ä‘Ã£ bá»‹ xÃ³a khá»i há»‡ thá»‘ng.',
          isExpired: true,
        });
      }
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Lá»—i khi láº¥y thÃ´ng tin Ä‘Æ¡n Ä‘áº·t phÃ²ng', error: error.message });
  }
};

// GET /api/customer/my-bookings
// Láº¥y danh sÃ¡ch lá»‹ch sá»­ Ä‘áº·t phÃ²ng cá»§a khÃ¡ch hÃ ng
export const getMyBookings = async (req, res) => {
  try {
    // Tá»± Ä‘á»™ng dá»n dáº¹p cÃ¡c Ä‘Æ¡n PENDING_PAYMENT quÃ¡ háº¡n 15 phÃºt trÆ°á»›c khi truy váº¥n
    await cleanExpiredPendingBookings();

    const customerId = req.user._id;
    const email = req.user.email?.trim().toLowerCase();

    // 1. Lá»c theo tÃ i khoáº£n Ä‘Äƒng nháº­p hoáº·c email ngÆ°á»i Ä‘áº·t
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
      // Náº¿u chÆ°a Ä‘Äƒng nháº­p vÃ  khÃ´ng cÃ³ email -> tráº£ vá» rá»—ng
      return res.status(200).json({ success: true, count: 0, bookings: [] });
    }

    // 2. Lá»c theo tráº¡ng thÃ¡i tab náº¿u cÃ³ yÃªu cáº§u tá»« client
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

    // 3. TÃ¬m kiáº¿m theo tá»« khÃ³a náº¿u cÃ³
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
    res.status(500).json({ message: 'Lá»—i khi láº¥y lá»‹ch sá»­ Ä‘áº·t phÃ²ng', error: error.message });
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
      return res.status(400).json({ message: 'ThÃ´ng tin tranh cháº¥p khÃ´ng há»£p lá»‡.' });
    }
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y booking cá»§a báº¡n.' });
    const disputeDeadline = new Date(booking.checkOutDate || booking.checkInDate).getTime() + 48 * 60 * 60 * 1000;
    if (Date.now() > disputeDeadline) return res.status(400).json({ message: 'Chá»‰ cÃ³ thá»ƒ gá»­i tranh cháº¥p trong 48 giá» sau khi káº¿t thÃºc lÆ°u trÃº.' });
    const hotel = await findBookingHotel(booking);
    if (!hotel?.ownerId) return res.status(400).json({ message: 'Booking chÆ°a cÃ³ thÃ´ng tin Ä‘á»‘i tÃ¡c Ä‘á»ƒ xá»­ lÃ½ tranh cháº¥p.' });
    const validAttachments = Array.isArray(attachments)
      ? attachments.filter((file) => file?.fileName && file?.fileUrl).slice(0, 5)
      : [];
    if (category === 'INCORRECT_INFORMATION' && validAttachments.length === 0) {
      return res.status(400).json({ message: 'Tranh cháº¥p sai thÃ´ng tin khÃ¡ch sáº¡n cáº§n cÃ³ tá»‘i thiá»ƒu má»™t báº±ng chá»©ng.' });
    }
    const existingDispute = await Dispute.exists({
      bookingId: booking._id,
      status: { $in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER'] },
    });
    if (existingDispute) return res.status(409).json({ message: 'Booking nÃ y Ä‘Ã£ cÃ³ tranh cháº¥p Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½.' });
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
    res.status(201).json({ message: 'ÄÃ£ gá»­i tranh cháº¥p Ä‘á»ƒ bá»™ pháº­n váº­n hÃ nh xem xÃ©t.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'KhÃ´ng thá»ƒ táº¡o tranh cháº¥p.', error: error.message });
  }
};

export const createRefundRequest = async (req, res) => {
  try {
    const { bookingId, disputeId, requestedAmount, reason } = req.body;
    const amount = Number(requestedAmount);
    if (!bookingId || !reason?.trim() || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'ThÃ´ng tin yÃªu cáº§u hoÃ n tiá»n khÃ´ng há»£p lá»‡.' });
    }
    const booking = await Booking.findOne({ _id: bookingId, customerId: req.user._id });
    if (!booking) return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y booking cá»§a báº¡n.' });
    if (booking.paymentStatus !== 'PAID') return res.status(400).json({ message: 'Chá»‰ booking Ä‘Ã£ thanh toÃ¡n má»›i cÃ³ thá»ƒ yÃªu cáº§u hoÃ n tiá»n.' });
    const existingRefund = await RefundRequest.exists({
      bookingId: booking._id,
      status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSED'] },
    });
    if (existingRefund) return res.status(409).json({ message: 'Booking nÃ y Ä‘Ã£ cÃ³ yÃªu cáº§u hoÃ n tiá»n Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½ hoáº·c Ä‘Ã£ hoÃ n.' });
    if (amount > Number(booking.totalAmount || 0)) return res.status(400).json({ message: 'Sá»‘ tiá»n yÃªu cáº§u khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ giÃ¡ trá»‹ booking.' });
    const hotel = await findBookingHotel(booking);
    if (!hotel?.ownerId) return res.status(400).json({ message: 'Booking chÆ°a cÃ³ thÃ´ng tin Ä‘á»‘i tÃ¡c Ä‘á»ƒ xá»­ lÃ½ hoÃ n tiá»n.' });
    if (disputeId) {
      const dispute = await Dispute.findOne({ _id: disputeId, bookingId: booking._id, customerId: req.user._id });
      if (!dispute) return res.status(400).json({ message: 'Tranh cháº¥p liÃªn káº¿t khÃ´ng há»£p lá»‡.' });
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
    res.status(201).json({ message: 'ÄÃ£ gá»­i yÃªu cáº§u hoÃ n tiá»n Ä‘á»ƒ xem xÃ©t.', refund });
  } catch (error) {
    res.status(500).json({ message: 'KhÃ´ng thá»ƒ táº¡o yÃªu cáº§u hoÃ n tiá»n.', error: error.message });
  }
};



