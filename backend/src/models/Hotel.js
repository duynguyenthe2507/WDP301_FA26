import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  provinceCity: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  starRating: { type: Number, required: true, min: 1, max: 5 },
  cancellationPolicy: { type: String, required: true, enum: ['one', 'three', 'none'] },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  status: { type: String, required: true, enum: ['PENDING', 'ACTIVE', 'REJECTED'], default: 'PENDING' },
  amenities: [{ type: String }],
  images: [{
    url: { type: String, required: true },
    publicId: { type: String },
    isCover: { type: Boolean, default: false }
  }],
  legalProfile: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

hotelSchema.virtual('roomTypes', {
  ref: 'RoomType',
  localField: '_id',
  foreignField: 'hotelId'
});

hotelSchema.set('toObject', { virtuals: true });
hotelSchema.set('toJSON', { virtuals: true });

const Hotel = mongoose.model('Hotel', hotelSchema);
export default Hotel;
