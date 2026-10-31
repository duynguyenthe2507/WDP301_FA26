import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    hotelName: { type: String, required: true, trim: true },
    hotelAddress: { type: String, default: "", trim: true },
    bookerFullName: { type: String, required: true, trim: true },
    bookerPhone: { type: String, required: true, trim: true },
    bookerEmail: { type: String, required: true, trim: true },
    isSelfGuest: { type: Boolean, default: true },
    guestFullName: { type: String, default: "" },
    guestPhone: { type: String, default: "" },
    adultsCount: { type: Number, required: true, min: 1, default: 1 },
    childrenCount: { type: Number, default: 0 },
    specialRequests: { type: String, default: "" },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    totalNights: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    bookingStatus: {
      type: String,
      required: true,
      enum: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED"],
      default: "PENDING_PAYMENT",
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["UNPAID", "PAID", "FAILED", "REFUNDED"],
      default: "UNPAID",
    },
  },
  { timestamps: true }
);

// Chi tiết các phòng trong đơn
bookingSchema.virtual("details", {
  ref: "BookingDetail",
  localField: "_id",
  foreignField: "bookingId",
});

// Khách sạn (tên, địa chỉ, ảnh, chính sách hủy)
bookingSchema.virtual("hotel", {
  ref: "Hotel",
  localField: "hotelId",
  foreignField: "_id",
  justOne: true,
});

// Giao dịch thanh toán gần nhất
bookingSchema.virtual("payment", {
  ref: "Payment",
  localField: "_id",
  foreignField: "bookingId",
  justOne: true,
  match: { type: "PAYMENT" },
  options: { sort: { createdAt: -1 } },
});

// Thông tin hủy đơn & hoàn tiền (chỉ có khi đơn đã hủy)
bookingSchema.virtual("cancellation", {
  ref: "BookingCancellation",
  localField: "_id",
  foreignField: "bookingId",
  justOne: true,
});

bookingSchema.set("toObject", { virtuals: true });
bookingSchema.set("toJSON", { virtuals: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
