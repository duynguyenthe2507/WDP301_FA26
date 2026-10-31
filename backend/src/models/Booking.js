import mongoose from 'mongoose';

const bookingDetailSchema = new mongoose.Schema({
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel.roomTypes',
    required: true,
  },
  roomTypeName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  pricePerNight: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },

    bookerFullName: {
      type: String,
      required: true,
      trim: true,
    },
    bookerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    bookerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    isSelfGuest: {
      type: Boolean,
      default: true,
    },
    guestFullName: {
      type: String,
      default: '',
      trim: true,
    },
    guestPhone: {
      type: String,
      default: '',
      trim: true,
    },

    adultsCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    childrenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    specialRequests: {
      type: String,
      default: '',
      trim: true,
    },

    // Ngày nhận & trả phòng
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    totalNights: {
      type: Number,
      required: true,
      min: 1,
    },

    // Mảng chi tiết đặt phòng (bảng booking_details nhúng)
    bookingDetails: [bookingDetailSchema],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'UNPAID',
      index: true,
    },

    // Thông tin hủy đơn & hoàn tiền
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    cancellationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationNote: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'PROCESSED'],
      default: 'NOT_APPLICABLE',
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
