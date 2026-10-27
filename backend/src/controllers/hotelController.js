import Hotel from '../models/Hotel.js';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';

const formatHotel = (hotel) => {
  const h = hotel.toObject ? hotel.toObject() : hotel;
  const primary_image =
    h.images?.find((img) => img.isCover)?.url ||
    h.images?.[0]?.url ||
    '';
  const activeRooms = (h.roomTypes || []).filter((rt) => !rt.isDeleted && rt.status !== 'MAINTENANCE' && rt.status !== 'INACTIVE');
  const prices = activeRooms.map((rt) => rt.basePrice).filter(Boolean);
  const min_price = prices.length > 0 ? Math.min(...prices) : undefined;

  return {
    ...h,
    _id: h._id.toString(),
    location: h.provinceCity || h.location || '',
    primary_image,
    min_price,
    rating_summary: {
      average_rating: h.ratingSummary?.averageRating || 0,
      total_reviews: h.ratingSummary?.totalReviews || 0,
    },
    room_types: activeRooms.map((rt) => ({
      ...rt,
      _id: rt._id.toString(),
      base_price: rt.basePrice,
      capacity: {
        adults: rt.adultCapacity || 2,
        children: rt.childrenCapacity || 0,
      },
      bed: rt.bedType ? [{ bed_type: rt.bedType, quantity: 1 }] : [],
      room_type_images: (rt.images || []).map((img, idx) => ({
        url: img.url,
        is_primary: idx === 0,
      })),
    })),
  };
};

export const getHotels = async (req, res) => {
  try {
    const { location, minPrice, maxPrice, minRating, page = 1, limit = 10 } = req.query;

    const andConditions = [];

    // Tìm kiếm theo địa điểm hoặc tên khách sạn
    if (location && location.trim()) {
      const keyword = location.trim();
      andConditions.push({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { provinceCity: { $regex: keyword, $options: 'i' } },
          { address: { $regex: keyword, $options: 'i' } },
        ],
      });
    }

    // Lọc theo đánh giá tối thiểu (sao)
    if (minRating) {
      const ratingVal = Number(minRating);
      andConditions.push({
        $or: [
          { starRating: { $gte: ratingVal } },
          { 'ratingSummary.averageRating': { $gte: ratingVal } },
        ],
      });
    }

    const query = {};
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Lọc theo giá phòng
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      query.roomTypes = {
        $elemMatch: {
          basePrice: priceFilter,
          isDeleted: { $ne: true },
        },
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Hotel.countDocuments(query);
    const rawHotels = await Hotel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const hotels = rawHotels.map(formatHotel);

    res.status(200).json({
      success: true,
      hotels,
      total,
      page: pageNum,
      total_pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khách sạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm khách sạn',
      error: error.message,
    });
  }
};

export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn này',
      });
    }

    res.status(200).json({
      success: true,
      hotel: formatHotel(hotel),
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết khách sạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải thông tin khách sạn',
      error: error.message,
    });
  }
};

export const checkRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.query;

    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn',
      });
    }

    // Neu khong truyen ngay, tra ve so phong mac dinh
    if (!checkIn || !checkOut) {
      const defaultAvail = (hotel.roomTypes || [])
        .filter((rt) => !rt.isDeleted && rt.status !== 'INACTIVE' && rt.status !== 'MAINTENANCE')
        .map((rt) => ({
          room_type_id: rt._id.toString(),
          room_type_name: rt.name,
          total_rooms: rt.totalRooms || 0,
          available_rooms: rt.totalRooms || 0,
          is_available: (rt.totalRooms || 0) > 0,
          price_per_night: rt.basePrice,
        }));

      return res.status(200).json({
        success: true,
        hotel_id: id,
        room_availability: defaultAvail,
      });
    }

    const reqInStr = String(checkIn).slice(0, 10);
    const reqOutStr = String(checkOut).slice(0, 10);

    // Lay danh sach don dat cua khach san
    // Don hop le chiem phong: CONFIRMED, PAID, hoac PENDING_PAYMENT chua qua 15 phut
    // hotelId trong Booking luon luu duoi dang String
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const activeBookings = await Booking.find({
      hotelId: id.toString(),
      bookingStatus: { $nin: ['CANCELLED'] },
      paymentStatus: { $ne: 'FAILED' },
      $or: [
        { bookingStatus: 'CONFIRMED' },
        { paymentStatus: 'PAID' },
        {
          bookingStatus: 'PENDING_PAYMENT',
          createdAt: { $gte: fifteenMinutesAgo },
        },
      ],
    });

    // Tinh tong so phong da dat theo tung roomTypeId trong khoang [checkIn, checkOut]
    const bookedCountsByRoomType = {};

    for (const b of activeBookings) {
      const bInStr = b.checkInDate ? new Date(b.checkInDate).toISOString().slice(0, 10) : '';
      const bOutStr = b.checkOutDate ? new Date(b.checkOutDate).toISOString().slice(0, 10) : '';

      // Kiem tra trung ngay: bIn < reqOut && bOut > reqIn
      const isOverlap = bInStr < reqOutStr && bOutStr > reqInStr;

      if (isOverlap && Array.isArray(b.bookingDetails)) {
        for (const detail of b.bookingDetails) {
          const rtId = detail.roomTypeId?.toString();
          const qty = Number(detail.quantity) || 1;
          if (rtId) {
            bookedCountsByRoomType[rtId] = (bookedCountsByRoomType[rtId] || 0) + qty;
          }
        }
      }
    }

    // Tinh so phong con trong thuc te
    const room_availability = (hotel.roomTypes || [])
      .filter((rt) => !rt.isDeleted && rt.status !== 'INACTIVE' && rt.status !== 'MAINTENANCE')
      .map((rt) => {
        const rtId = rt._id.toString();
        const total = Number(rt.totalRooms) || 0;
        const booked = bookedCountsByRoomType[rtId] || 0;
        const available = Math.max(0, total - booked);

        return {
          room_type_id: rtId,
          room_type_name: rt.name,
          total_rooms: total,
          booked_rooms: booked,
          available_rooms: available,
          is_available: available > 0,
          price_per_night: rt.basePrice,
        };
      });

    res.status(200).json({
      success: true,
      hotel_id: id,
      check_in: checkIn,
      check_out: checkOut,
      room_availability,
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra phòng trống:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra phòng trống',
      error: error.message,
    });
  }
};

export const getHotelReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(200).json({
        success: true,
        reviews: [],
        stats: {
          totalReviews: 0,
          averageRating: 0,
          starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      });
    }

    const hotelObjectId = new mongoose.Types.ObjectId(id);

    // Thong ke tat ca danh gia cua khach san de tinh starCounts va averageRating
    const allReviews = await Review.find({
      $or: [{ hotelId: hotelObjectId }, { hotelId: id.toString() }],
    })
      .populate('customerId', 'fullName avatarUrl email')
      .sort({ createdAt: -1 });

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    allReviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (starCounts[star] !== undefined) {
        starCounts[star] += 1;
      }
      totalScore += r.rating;
    });

    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;

    // Loc theo so sao neu co yeu cau
    let filteredReviews = allReviews;
    if (rating && Number(rating) >= 1 && Number(rating) <= 5) {
      filteredReviews = allReviews.filter((r) => Math.round(r.rating) === Number(rating));
    }

    const formattedReviews = filteredReviews.map((r) => ({
      _id: r._id.toString(),
      rating: r.rating,
      comment: r.comment,
      images: r.images || [],
      partnerReply: r.partnerReply,
      createdAt: r.createdAt,
      customer: {
        fullName: r.customerId?.fullName || 'Khách hàng ẩn danh',
        avatarUrl: r.customerId?.avatarUrl || '',
      },
    }));

    res.status(200).json({
      success: true,
      reviews: formattedReviews,
      stats: {
        totalReviews,
        averageRating,
        starCounts,
      },
    });
  } catch (error) {
    console.error('Loi khi lay danh gia khach san:', error);
    res.status(500).json({
      success: false,
      message: 'Loi server khi tai danh gia khach san',
      error: error.message,
    });
  }
};
