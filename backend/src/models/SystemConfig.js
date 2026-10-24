import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    isMaintenanceMode: { type: Boolean, default: false }, // true = Đang bảo trì, false = Tắt
    maintenanceMessage: {
      type: String,
      default:
        "Hệ thống VinaStay đang bảo trì nâng cấp, vui lòng quay lại sau.",
    },
  },
  { timestamps: true },
);

export default mongoose.model("SystemConfig", systemConfigSchema);
