import axios from 'axios';

export const createHotel = (draft, token) => axios.post('http://localhost:9999/api/partner/hotels', {
  location: draft.location,
  amenities: draft.amenities,
  rooms: draft.rooms,
  details: draft.details,
  profile: draft.profile,
  images: draft.photos,
}, { headers: { Authorization: `Bearer ${token}` } });
