import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Tải cấu hình biến môi trường
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌ Lỗi: Không tìm thấy MONGO_URL trong file .env');
  process.exit(1);
}

// Thư mục chứa dữ liệu JSON
const DATA_DIR = path.join(__dirname, '../../../database');

// Danh sách 10 collections cần nạp
const COLLECTIONS = [
  { name: 'users', file: 'users.json' },
  { name: 'hotels', file: 'hotels.json' },
  { name: 'roomtypes', file: 'roomtypes.json' },
  { name: 'bookings', file: 'bookings.json' },
  { name: 'bookingdetails', file: 'bookingdetails.json' },
  { name: 'payments', file: 'payments.json' },
  { name: 'complaints', file: 'complaints.json' },
  { name: 'reviews', file: 'reviews.json' },
  { name: 'auditlogs', file: 'auditlogs.json' },
  { name: 'systemconfigs', file: 'systemconfigs.json' },
];

/**
 * Đệ quy chuyển đổi định dạng BSON MongoDB Extended JSON
 * { "$oid": "..." } -> ObjectId("...")
 * { "$date": "..." } -> Date("...")
 */
function parseExtendedJson(item) {
  if (item === null || item === undefined) return item;

  if (Array.isArray(item)) {
    return item.map(parseExtendedJson);
  }

  if (typeof item === 'object') {
    if (item.$oid && typeof item.$oid === 'string') {
      return new mongoose.Types.ObjectId(item.$oid);
    }
    if (item.$date) {
      return new Date(item.$date);
    }

    const transformed = {};
    for (const key of Object.keys(item)) {
      transformed[key] = parseExtendedJson(item[key]);
    }
    return transformed;
  }

  return item;
}

async function seedDatabase() {
  console.log('🚀 Đang kết nối tới MongoDB...');
  try {
    await mongoose.connect(MONGO_URL);
    console.log('✅ Đã kết nối thành công tới Database!\n');

    const db = mongoose.connection.db;

    // Lấy danh sách các collections hiện có trong DB
    const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

    console.log('🧹 BƯỚC 1: XÓA DỮ LIỆU CŨ (CLEANUP)');
    console.log('--------------------------------------------------');
    for (const { name } of COLLECTIONS) {
      if (existingCollections.includes(name)) {
        await db.collection(name).drop();
        console.log(`  🗑️  Đã xóa collection: [${name}]`);
      }
    }
    console.log('--------------------------------------------------\n');

    console.log('🌱 BƯỚC 2: NẠP DỮ LIỆU MẪU MỚI (SEEDING)');
    console.log('--------------------------------------------------');

    let totalInserted = 0;

    for (const { name, file } of COLLECTIONS) {
      const filePath = path.join(DATA_DIR, file);

      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  Không tìm thấy file: ${file}, bỏ qua.`);
        continue;
      }

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const rawJson = JSON.parse(rawContent);

      if (!Array.isArray(rawJson) || rawJson.length === 0) {
        console.log(`  ⚪ [${name}]: 0 bản ghi`);
        continue;
      }

      // Chuyển đổi $oid và $date sang BSON Type hợp lệ
      const parsedData = rawJson.map(parseExtendedJson);

      await db.collection(name).insertMany(parsedData);
      console.log(`  ✅ [${name.padEnd(15)}] Đã nạp thành công: ${parsedData.length} documents`);
      totalInserted += parsedData.length;
    }

    console.log('--------------------------------------------------');
    console.log(`🎉 HOÀN TẤT SEED DATABASE! Tổng cộng: ${totalInserted} documents đã được nạp.\n`);
    console.log('🔑 THÔNG TIN ĐĂNG NHẬP MẪU:');
    console.log('   - Mật khẩu mặc định cho tất cả tài khoản: 123456');
    console.log('   - Admin: admin@vinastay.com');
    console.log('   - Operations Manager: manager@vinastay.com');
    console.log('   - Hotel Partner: partner.hanoi@vinastay.com / partner.danang@vinastay.com');
    console.log('   - Customer: hoang.customer@gmail.com / mai.vu@gmail.com');
    console.log('--------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình Seed Database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB.');
    process.exit(0);
  }
}

seedDatabase();
