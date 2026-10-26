import mongoose from 'mongoose';

const commissionPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    calculationType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ['GLOBAL', 'PARTNER', 'HOTEL'], default: 'GLOBAL' },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export default mongoose.model('CommissionPolicy', commissionPolicySchema);
