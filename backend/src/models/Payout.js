import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    bookingIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Booking', default: [] },
    commissionBreakdown: {
      type: [{
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
        policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionPolicy', default: null },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      }],
      default: [],
    },
    grossRevenue: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    refundAdjustment: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'VND', trim: true },
    status: { type: String, enum: ['DRAFT', 'ON_HOLD', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID'], default: 'DRAFT', index: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionPolicy', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    paymentReference: { type: String, default: '', trim: true },
    holdReason: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

payoutSchema.index({ partnerId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export default mongoose.model('Payout', payoutSchema);
