import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    isCover: { type: Boolean, default: false },
  },
  { _id: false },
);

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  bedType: { type: String, default: "", trim: true },
  roomSize: { type: Number, min: 0 },
  adultCapacity: { type: Number, required: true, min: 1 },
  childrenCapacity: { type: Number, default: 0, min: 0 },
  totalRooms: { type: Number, required: true, min: 1 },
  basePrice: { type: Number, required: true, min: 0 },
  amenities: { type: [String], default: [] },
  images: { type: [imageSchema], default: [] },
  status: { type: String, default: "ACTIVE" },
  isDeleted: { type: Boolean, default: false },
});

const legalProfileSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true },
    legalAddress: { type: String, trim: true },
    postcode: { type: String, trim: true },
    country: { type: String, trim: true },
    beneficiary: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      nationality: { type: String, trim: true },
      birthday: { type: String, trim: true },
      residenceCountry: { type: String, trim: true },
      region: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    contact: {
      language: { type: String, trim: true },
      countryCode: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
  },
  { _id: false },
);

const hotelSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    provinceCity: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    starRating: { type: Number, required: true, min: 1, max: 5 },
    cancellationPolicy: {
      type: String,
      enum: ["one", "three", "none"],
      required: true,
    },
    ratingSummary: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "REJECTED"],
      default: "PENDING",
    },
    images: { type: [imageSchema], default: [] },
    amenities: { type: [String], default: [] },
    roomTypes: { type: [roomTypeSchema], default: [] },
    legalProfile: { type: legalProfileSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "hotels" },
);

export default mongoose.model("Hotel", hotelSchema);
