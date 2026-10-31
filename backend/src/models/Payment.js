import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      required: true,
      enum: ["PAYMENT", "REFUND"],
      default: "PAYMENT",
    },
    gateway: { type: String, required: true, default: "VNPAY" },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    txnRef: { type: String, required: true, unique: true },
    transactionNo: { type: String, default: "" },
    bankCode: { type: String, default: "" },
    cardType: { type: String, default: "" },
    responseCode: { type: String, default: "" },
    payDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
