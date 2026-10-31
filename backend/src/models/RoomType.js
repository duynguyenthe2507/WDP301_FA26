import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  bedType: { type: String, required: true },
  roomSize: { type: Number, required: true },
  adultCapacity: { type: Number, required: true, min: 1 },
  childrenCapacity: { type: Number, default: 0 },
  totalRooms: { type: Number, required: true, min: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  amenities: [{ type: String }],
  images: [{
    url: { type: String, required: true },
    publicId: { type: String }
  }],
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const RoomType = mongoose.model('RoomType', roomTypeSchema);
export default RoomType;
