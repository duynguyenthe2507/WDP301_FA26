import mongoose from 'mongoose';

const hotelRegistrationDraftSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    step: { type: String, required: true },
  },
  { timestamps: true, minimize: false },
);

export default mongoose.model('HotelRegistrationDraft', hotelRegistrationDraftSchema);
