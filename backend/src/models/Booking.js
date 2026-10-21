import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hotelId: {
      type: String,
      default: '',
    },
    hotelName: {
      type: String,
      default: '',
    },
    hotelAddress: {
      type: String,
      default: '',
    },
    bookerInfo: {
      fullName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      email: { type: String, required: true },
    },
    isSelfGuest: {
      type: Boolean,
      default: true,
    },
    guestInfo: {
      fullName: { type: String, default: '' },
      phoneNumber: { type: String, default: '' },
    },
    specialRequests: {
      type: String,
      default: '',
    },
    checkInDate: {
      type: Date,
      default: Date.now,
    },
    checkOutDate: {
      type: Date,
      default: () => new Date(Date.now() + 86400000),
    },
    totalNights: {
      type: Number,
      default: 1,
    },
    bookingDetails: [
      {
        roomTypeId: { type: String, default: '' },
        roomTypeName: { type: String, default: 'Phòng Deluxe' },
        quantity: { type: Number, default: 1 },
        pricePerNight: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING_PAYMENT',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID', 'FAILED'],
      default: 'UNPAID',
    },
    paymentMethod: {
      type: String,
      default: 'VNPAY',
    },
    vnpayTransaction: {
      vnp_TxnRef: { type: String },
      vnp_TransactionNo: { type: String },
      vnp_BankCode: { type: String },
      vnp_CardType: { type: String },
      vnp_PayDate: { type: String },
      vnp_ResponseCode: { type: String },
      vnp_OrderInfo: { type: String },
    },
    // Thông tin hủy đơn & hoàn tiền
    cancellationReason: {
      type: String,
      default: '',
    },
    cancellationNote: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationFee: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSED'],
      default: 'NOT_APPLICABLE',
    },
    cancellationPolicySnapshot: {
      type: String,
      default: '',
    },
    hotelImage: {
      type: String,
      default: '',
    },
    guestCounts: {
      adults: { type: Number, default: 2 },
      children: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
