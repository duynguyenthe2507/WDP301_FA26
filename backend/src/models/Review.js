import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // 1 Booking tương ứng tối đa 1 Review
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
      },
    ],
    partnerReply: {
      content: { type: String, default: '' },
      repliedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

// Tránh lỗi overwrite model khi nodemon reload
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
