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
    old_role: String,
    new_role: String,
    old_status: String,
    new_status: String,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
