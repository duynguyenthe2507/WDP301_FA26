import mongoose from "mongoose";

const bookingDetailSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
    index: true,
  },
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType",
    required: true,
  },
  roomTypeName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
});

const BookingDetail = mongoose.model("BookingDetail", bookingDetailSchema);
export default BookingDetail;
