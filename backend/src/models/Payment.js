import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    transactionId: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ['PAYMENT', 'REFUND'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'VND', trim: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING', index: true },
    paymentResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema);
