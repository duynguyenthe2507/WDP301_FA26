import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Profile
export const getMyProfile = () => api.get('/api/customer/profile');
export const updateMyProfile = (data) => api.put('/api/customer/profile', data);
export const changePassword = (data) => api.put('/api/customer/change-password', data);

// Hotels
export const searchHotels = (params = {}) => api.get('/api/customer/hotels', { params });
export const getHotelById = (hotelId) => api.get(`/api/customer/hotels/${hotelId}`);
export const checkAvailability = (hotelId, checkIn, checkOut) =>
  api.get(`/api/customer/hotels/${hotelId}/availability`, { params: { checkIn, checkOut } });
export const getHotelReviews = (hotelId, params = {}) =>
  api.get(`/api/customer/hotels/${hotelId}/reviews`, { params });

// Booking & VNPay
export const createPendingBooking = (payload) => api.post('/api/customer/bookings/pending', payload);
export const verifyVNPayPayment = (params) => api.get('/api/customer/bookings/vnpay-verify', { params });
export const getBookingByCode = (bookingCode) => api.get(`/api/customer/bookings/${bookingCode}`);
export const getMyBookings = (params = {}) => api.get('/api/customer/my-bookings', { params });

// Đánh giá kỳ nghỉ (Reviews)
export const getMyReviews = () => api.get('/api/customer/reviews');
export const getPendingReviewBookings = () => api.get('/api/customer/reviews/pending-bookings');
export const getBookingReviewInfo = (bookingId) => api.get(`/api/customer/reviews/booking-info/${bookingId}`);
export const createReview = (payload) => api.post('/api/customer/reviews', payload);
export const updateReview = (id, payload) => api.put(`/api/customer/reviews/${id}`, payload);
export const deleteReview = (id) => api.delete(`/api/customer/reviews/${id}`);


