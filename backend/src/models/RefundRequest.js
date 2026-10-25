import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'VND', trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSED'], default: 'REQUESTED', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true },
);

export default mongoose.model('RefundRequest', refundRequestSchema);
