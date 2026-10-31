import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    transactionNo: {
      type: String,
      default: '',
      trim: true,
    },
    txnRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['PAYMENT', 'REFUND'],
      default: 'PAYMENT',
      required: true,
    },
    gateway: {
      type: String,
      default: 'VNPAY',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    bankCode: {
      type: String,
      default: '',
      trim: true,
    },
    cardType: {
      type: String,
      default: '',
      trim: true,
    },
    responseCode: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    payDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema);
