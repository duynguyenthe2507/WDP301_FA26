import axios from 'axios';

export const createHotel = (draft, token) => axios.post('http://localhost:9999/api/partner/hotels', {
  location: draft.location,
  amenities: draft.amenities,
  rooms: draft.rooms,
  details: draft.details,
  profile: draft.profile,
  images: draft.photos,
  termsAccepted: draft.termsAccepted,
}, { headers: { Authorization: `Bearer ${token}` } });

// type: 'hotel' | 'room' — trả về { images: [{ url, publicId }] }
export const uploadImages = (files, type, token) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  return axios.post(`http://localhost:9999/api/partner/uploads/images?type=${type}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getMyHotel = (token) => axios.get('http://localhost:9999/api/partner/hotels/me', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getHotelDetail = (token) => axios.get('http://localhost:9999/api/partner/hotel', {
  headers: { Authorization: `Bearer ${token}` },
});

export const updateHotel = (hotel, token) => axios.put('http://localhost:9999/api/partner/hotel', hotel, {
  headers: { Authorization: `Bearer ${token}` },
});

export const createRoomType = (roomType, token) => axios.post('http://localhost:9999/api/partner/room-types', roomType, {
  headers: { Authorization: `Bearer ${token}` },
});

export const updateRoomType = (id, roomType, token) => axios.put(`http://localhost:9999/api/partner/room-types/${id}`, roomType, {
  headers: { Authorization: `Bearer ${token}` },
});

export const updateRoomTypeStatus = (id, status, token) => axios.patch(`http://localhost:9999/api/partner/room-types/${id}/status`, { status }, {
  headers: { Authorization: `Bearer ${token}` },
});

export const deleteRoomType = (id, token) => axios.delete(`http://localhost:9999/api/partner/room-types/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});

// Bỏ các bộ lọc rỗng để backend không phải kiểm tra chuỗi rỗng
export const getPartnerBookings = (params, token) => axios.get('http://localhost:9999/api/partner/bookings', {
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  headers: { Authorization: `Bearer ${token}` },
});

export const getPartnerBooking = (id, token) => axios.get(`http://localhost:9999/api/partner/bookings/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});

export const acknowledgeBooking = (id, token) => axios.post(`http://localhost:9999/api/partner/bookings/${id}/acknowledge`, {}, {
  headers: { Authorization: `Bearer ${token}` },
});

// body: { initiator: 'CUSTOMER' | 'HOTEL', reason, note, waiveFee }
export const cancelPartnerBooking = (id, body, token) => axios.post(`http://localhost:9999/api/partner/bookings/${id}/cancel`, body, {
  headers: { Authorization: `Bearer ${token}` },
});

export const getPartnerDisputes = (params, token) => axios.get('http://localhost:9999/api/partner/disputes', {
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  headers: { Authorization: `Bearer ${token}` },
});

export const getValidReportSummary = (token) => axios.get('http://localhost:9999/api/partner/disputes/valid-report-summary', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getPartnerDispute = (id, token) => axios.get(`http://localhost:9999/api/partner/disputes/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});

export const respondPartnerDispute = (id, message, token) => axios.post(`http://localhost:9999/api/partner/disputes/${id}/responses`, { message }, {
  headers: { Authorization: `Bearer ${token}` },
});

export const editPartnerDisputeResponse = (id, index, message, token) => axios.put(`http://localhost:9999/api/partner/disputes/${id}/responses/${index}`, { message }, {
  headers: { Authorization: `Bearer ${token}` },
});

export const getPartnerReviews = (params, token) => axios.get('http://localhost:9999/api/partner/reviews', {
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  headers: { Authorization: `Bearer ${token}` },
});

export const getStatistics = (params, token) => axios.get('http://localhost:9999/api/partner/statistics', {
  params,
  headers: { Authorization: `Bearer ${token}` },
});

export const getRevenueLines = (params, token) => axios.get('http://localhost:9999/api/partner/statistics/revenue-lines', {
  params,
  headers: { Authorization: `Bearer ${token}` },
});

export const getRevenueReport = (params, token) => axios.get('http://localhost:9999/api/partner/statistics/revenue-report', {
  params,
  headers: { Authorization: `Bearer ${token}` },
});

export const getPayouts = (params, token) => axios.get('http://localhost:9999/api/partner/payouts', {
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  headers: { Authorization: `Bearer ${token}` },
});

export const getPayout = (id, token) => axios.get(`http://localhost:9999/api/partner/payouts/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});

export const getRoomTypes = (token) => axios.get('http://localhost:9999/api/partner/room-types', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getRoomType = (id, token) => axios.get(`http://localhost:9999/api/partner/room-types/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
