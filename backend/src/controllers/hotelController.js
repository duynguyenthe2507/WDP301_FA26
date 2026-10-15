import Hotel from '../models/Hotel.js';

const formatHotel = (hotel) => {
  const h = hotel.toObject ? hotel.toObject() : hotel;
  const primary_image =
    h.images?.find((img) => img.isCover)?.url ||
    h.images?.[0]?.url ||
    '';
  const activeRooms = (h.roomTypes || []).filter((rt) => !rt.isDeleted);
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
    room_types: (h.roomTypes || []).map((rt) => ({
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

    const query = {};

    // Tìm kiếm theo địa điểm hoặc tên khách sạn
    if (location && location.trim()) {
      const keyword = location.trim();
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { provinceCity: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Lọc theo đánh giá tối thiểu (sao)
    if (minRating) {
      const ratingVal = Number(minRating);
      query.$or = query.$or
        ? [
            {
              $and: [
                { $or: query.$or },
                {
                  $or: [
                    { starRating: { $gte: ratingVal } },
                    { 'ratingSummary.averageRating': { $gte: ratingVal } },
                  ],
                },
              ],
            },
          ]
        : [
            { starRating: { $gte: ratingVal } },
            { 'ratingSummary.averageRating': { $gte: ratingVal } },
          ];
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

    const room_availability = (hotel.roomTypes || [])
      .filter((rt) => !rt.isDeleted && rt.status !== 'INACTIVE')
      .map((rt) => ({
        room_type_id: rt._id.toString(),
        available_rooms: rt.totalRooms || 5,
        is_available: (rt.totalRooms || 5) > 0,
        price_per_night: rt.basePrice,
      }));

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
