import axios from 'axios';

export const createHotel = (draft, token) => axios.post('http://localhost:9999/api/partner/hotels', {
  location: draft.location,
  amenities: draft.amenities,
  rooms: draft.rooms,
  details: draft.details,
  profile: draft.profile,
  images: draft.photos,
}, { headers: { Authorization: `Bearer ${token}` } });

export const getMyHotel = (token) => axios.get('http://localhost:9999/api/partner/hotels/me', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getHotelDetail = (token) => axios.get('http://localhost:9999/api/partner/hotel', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getRoomTypes = (token) => axios.get('http://localhost:9999/api/partner/room-types', {
  headers: { Authorization: `Bearer ${token}` },
});

export const getRoomType = (id, token) => axios.get(`http://localhost:9999/api/partner/room-types/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
