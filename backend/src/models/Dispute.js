import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, min: 0, default: 0 },
    fileType: { type: String, default: '', trim: true },
    fileUrl: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const responseSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    respondedAt: { type: Date, default: Date.now },
    editedAt: { type: Date, default: null },
  },
  { _id: false },
);

const disputeSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingCode: { type: String, required: true, trim: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: ['INCORRECT_INFORMATION', 'SERVICE_QUALITY', 'OVERCHARGE', 'CANCELLATION', 'OTHER'], required: true },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    attachments: { type: [attachmentSchema], default: [] },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED', 'WITHDRAWN'], default: 'PENDING', index: true },
    withdrawnAt: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    responses: { type: [responseSchema], default: [] },
    resolution: {
      outcome: { type: String, enum: ['UPHELD', 'PARTIALLY_UPHELD', 'REJECTED', 'NO_ACTION'], default: null },
      message: { type: String, default: '', trim: true },
      // Chỉ có khi bác bỏ: FALSE_INFORMATION = khách cung cấp thông tin sai sự thật; trống = chưa đủ căn cứ
      rejectReason: { type: String, enum: ['', 'FALSE_INFORMATION'], default: '' },
      // Nội dung Manager soạn riêng để gửi khách; trống thì khách thấy `message`
      customerNotice: { type: String, default: '', trim: true },
      // Nội dung Manager soạn riêng để gửi khách sạn; trống thì khách sạn thấy `message`
      partnerNotice: { type: String, default: '', trim: true },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// Số lần khiếu nại sai sự thật được phép; vượt quá (lần thứ MAX + 1) thì khóa vĩnh viễn
export const CUSTOMER_MAX_FALSE_CLAIMS = 3;

export default mongoose.model('Dispute', disputeSchema);
