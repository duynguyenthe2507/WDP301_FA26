import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    old_status: String,
    new_status: String,
    old_reason: String,
    new_reason: String,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
