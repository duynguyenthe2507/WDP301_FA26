import axios from 'axios';

export const createHotel = (draft, token) => axios.post('http://localhost:9999/api/partner/hotels', {
  location: draft.location,
  amenities: draft.amenities,
  rooms: draft.rooms,
  details: draft.details,
  profile: draft.profile,
  images: draft.photos,
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

export const getRoomTypes = (token) => axios.get('http://localhost:9999/api/partner/room-types', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getRoomType = (id, token) => axios.get(`http://localhost:9999/api/partner/room-types/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
