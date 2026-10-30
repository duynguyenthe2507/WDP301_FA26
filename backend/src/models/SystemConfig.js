import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    isMaintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: 'Hệ thống VinaStay đang bảo trì nâng cấp, vui lòng quay lại sau.',
    },
  },
  { timestamps: true }
);

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
export default SystemConfig;
