import mongoose from "mongoose";

const bookingCancellationSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    reason: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    cancelledAt: { type: Date, default: Date.now },
    cancellationFee: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: {
      type: String,
      enum: ["NOT_APPLICABLE", "PENDING", "PROCESSED"],
      default: "NOT_APPLICABLE",
    },
  },
  { timestamps: true }
);

const BookingCancellation = mongoose.model(
  "BookingCancellation",
  bookingCancellationSchema
);
export default BookingCancellation;
