import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    bedType: { type: String, default: '' },
    roomSize: { type: Number, default: 0 },
    adultCapacity: { type: Number, default: 2 },
    childrenCapacity: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 1 },
    basePrice: { type: Number, required: true },
    amenities: [{ type: String }],
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
      },
    ],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const hotelSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: { type: String, required: true, trim: true },
    provinceCity: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    starRating: { type: Number, default: 0 },
    cancellationPolicy: { type: String, default: '' },
    ratingSummary: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'APPROVED',
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        isCover: { type: Boolean, default: false },
      },
    ],
    amenities: [{ type: String }],
    roomTypes: [roomTypeSchema],
  },
  {
    timestamps: true,
    collection: 'hotels',
  }
);

const Hotel = mongoose.model('Hotel', hotelSchema);

export default Hotel;
