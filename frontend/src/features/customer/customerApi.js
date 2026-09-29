import axios from 'axios';
import { MOCK_HOTELS } from './mockHotelsData';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';

// Axios instance với base URL cho các API thực tế (như Profile)
const api = axios.create({ baseURL: API_URL });

// Interceptor: tự động gắn JWT token vào mọi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// CUSTOMER PROFILE APIs (kết nối Backend thực tế, cần token)
// ─────────────────────────────────────────────

/** Lấy thông tin profile của customer đang đăng nhập */
export const getMyProfile = () => api.get('/api/customer/profile');

/**
 * Cập nhật thông tin cá nhân
 * @param {{ full_name: string, phone_number: string }} data
 */
export const updateMyProfile = (data) => api.put('/api/customer/profile', data);

/**
 * Đổi mật khẩu
 * @param {{ current_password: string, new_password: string, confirm_password: string }} data
 */
export const changePassword = (data) => api.put('/api/customer/change-password', data);

// ─────────────────────────────────────────────
// HOTEL APIs (Frontend UI Mock Data - Độc lập không cần Backend)
// ─────────────────────────────────────────────

/**
 * Tìm kiếm danh sách khách sạn
 * @param {{ location?: string, page?: number, limit?: number, minPrice?: number, maxPrice?: number, minRating?: number }} params
 */
export const searchHotels = async (params = {}) => {
  // Giả lập network delay nhẹ cho trải nghiệm UI thực tế
  await new Promise((resolve) => setTimeout(resolve, 200));

  const { location, page = 1, limit = 6, minPrice, maxPrice, minRating } = params;

  let filtered = [...MOCK_HOTELS];

  if (location && location.trim()) {
    const term = location.trim().toLowerCase();
    filtered = filtered.filter(
      (h) =>
        h.name.toLowerCase().includes(term) ||
        h.location.toLowerCase().includes(term) ||
        h.address.toLowerCase().includes(term)
    );
  }

  if (minRating) {
    filtered = filtered.filter((h) => h.rating_summary?.average_rating >= parseFloat(minRating));
  }

  if (minPrice || maxPrice) {
    filtered = filtered.filter((h) => {
      const minHotelPrice = Math.min(...(h.room_types || []).map((rt) => rt.base_price));
      if (minPrice && minHotelPrice < parseFloat(minPrice)) return false;
      if (maxPrice && minHotelPrice > parseFloat(maxPrice)) return false;
      return true;
    });
  }

  const total = filtered.length;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = parseInt(limit) || 6;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;

  const paginatedHotels = filtered.slice(skip, skip + limitNum).map((h) => {
    const primaryImg = h.images?.find((img) => img.is_primary) || h.images?.[0];
    const min_price = h.room_types?.length
      ? Math.min(...h.room_types.map((rt) => rt.base_price))
      : null;
    return {
      _id: h._id,
      name: h.name,
      location: h.location,
      address: h.address,
      primary_image: primaryImg?.url || null,
      rating_summary: h.rating_summary,
      min_price
    };
  });

  return {
    data: {
      hotels: paginatedHotels,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: totalPages
    }
  };
};

/**
 * Lấy chi tiết một khách sạn theo ID
 * @param {string} hotelId
 */
export const getHotelById = async (hotelId) => {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const hotel = MOCK_HOTELS.find((h) => h._id === hotelId);
  if (!hotel) {
    const err = new Error('Không tìm thấy khách sạn');
    err.response = { status: 404, data: { message: 'Không tìm thấy khách sạn' } };
    throw err;
  }
  return {
    data: { hotel }
  };
};

/**
 * Kiểm tra phòng trống của một khách sạn trong khoảng ngày
 * @param {string} hotelId
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 */
export const checkAvailability = async (hotelId, checkIn, checkOut) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const hotel = MOCK_HOTELS.find((h) => h._id === hotelId);
  if (!hotel) {
    const err = new Error('Không tìm thấy khách sạn');
    err.response = { status: 404, data: { message: 'Không tìm thấy khách sạn' } };
    throw err;
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

  const room_availability = hotel.room_types.map((rt) => {
    // Giả lập phòng trống ngẫu nhiên thực tế (còn từ 2 đến tổng số phòng)
    const available_rooms = Math.max(1, rt.total_rooms - 2);
    return {
      room_type_id: rt._id,
      name: rt.name,
      base_price: rt.base_price,
      currency: rt.currency,
      capacity: rt.capacity,
      total_rooms: rt.total_rooms,
      booked_rooms: rt.total_rooms - available_rooms,
      available_rooms,
      is_available: true,
      status: rt.status
    };
  });

  return {
    data: {
      hotel_id: hotelId,
      hotel_name: hotel.name,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      room_availability
    }
  };
};
