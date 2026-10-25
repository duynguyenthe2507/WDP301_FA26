import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const verificationHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, default: '', trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const hotelVerificationSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documents: { type: [documentSchema], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewNote: { type: String, default: '', trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    history: { type: [verificationHistorySchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('HotelVerification', hotelVerificationSchema);
