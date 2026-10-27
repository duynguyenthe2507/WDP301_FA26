import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Notification', notificationSchema);
