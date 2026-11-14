import SystemConfig from '../models/SystemConfig.js';

const DEFAULT_MESSAGE = 'Hệ thống VinaStay đang bảo trì nâng cấp, vui lòng quay lại sau.';
const CACHE_MS = 5000;
let cache = null;

// Đọc cờ bảo trì có nhớ đệm vài giây để không phải truy vấn DB ở mọi request
export const getMaintenance = async () => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const config = await SystemConfig.findOne().lean();
  const value = { on: !!config?.isMaintenanceMode, message: config?.maintenanceMessage || DEFAULT_MESSAGE };
  cache = { at: Date.now(), value };
  return value;
};

// Admin vừa đổi cấu hình thì có hiệu lực ngay
export const clearMaintenanceCache = () => { cache = null; };

// Khi bảo trì, chỉ cho qua /api/admin (đã giới hạn role ADMIN), /api/auth (đăng nhập có kiểm tra role riêng)
// và callback VNPay để không mất xác nhận thanh toán đang dở
export const maintenanceGuard = async (req, res, next) => {
  try {
    const open = req.path === '/' || /^\/api\/(admin|auth)(\/|$)/.test(req.path) || req.path.includes('vnpay');
    if (open) return next();
    const { on, message } = await getMaintenance();
    if (!on) return next();
    return res.status(503).json({ maintenance: true, message });
  } catch (error) {
    next(error);
  }
};
