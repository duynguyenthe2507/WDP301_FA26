import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    target_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    action: {
      type: String,
      required: true,
    },
    old_status: { type: String, default: '' },
    new_status: { type: String, default: '' },
    old_reason: { type: String, default: '' },
    new_reason: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
