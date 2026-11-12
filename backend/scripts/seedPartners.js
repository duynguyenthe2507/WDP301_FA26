import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Hotel from '../src/models/Hotel.js';
import RoomType from '../src/models/RoomType.js';

dotenv.config();

const img = (id) => ({ url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`, publicId: `seed/${id}` });
const ROOM_IMGS = ['1551882547-ff40c63fe5fa', '1618773928121-c32242e63f39', '1590490360182-c33d57733427', '1595576508898-0ad5c879a061'];
const HOTEL_AMENITIES = ['Bể bơi', 'Bãi đỗ xe', 'Spa', 'Wi-Fi miễn phí', 'Phòng tập', 'Bàn tiếp tân 24 giờ', 'Máy điều hòa', 'Nhà hàng'];
const ROOM_AMENITIES = ['Wi-Fi miễn phí', 'Máy điều hòa', 'TV màn hình phẳng', 'Minibar', 'Két an toàn', 'Máy sấy tóc'];

const partners = [
  { email: 'partner1@hovi.vn', fullName: 'Nguyễn Văn An', phoneNumber: '0901234561',
    hotel: { name: 'Hovi Grand Hà Nội', provinceCity: 'Hà Nội', address: '25 Tràng Tiền, Hoàn Kiếm, Hà Nội', starRating: 5, cancellationPolicy: 'three',
      description: 'Khách sạn 5 sao sát hồ Hoàn Kiếm, kiến trúc Pháp cổ điển, nhà hàng và spa cao cấp.', images: ['1566073771259-6a8506099945', '1582719478250-c89cae4dc85b'] },
    rooms: [['Deluxe Hồ Gươm', '1 giường King', 32, 2, 1, 15, 2200000], ['Premier Twin', '2 giường đơn', 35, 2, 1, 10, 2500000], ['Suite Gia đình', '1 giường King', 55, 3, 2, 5, 4800000]] },
  { email: 'partner2@hovi.vn', fullName: 'Trần Thị Bình', phoneNumber: '0901234562',
    hotel: { name: 'Hovi Beach Resort Đà Nẵng', provinceCity: 'Đà Nẵng', address: '88 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng', starRating: 5, cancellationPolicy: 'one',
      description: 'Resort ven biển Mỹ Khê với hồ bơi vô cực, phòng hướng biển và bữa sáng buffet.', images: ['1571896349842-33c89424de2d', '1520250497591-112f2f40a3f4'] },
    rooms: [['Phòng hướng biển', '1 giường Queen', 38, 2, 1, 20, 2800000], ['Bungalow Hồ bơi', '1 giường King', 45, 2, 2, 8, 3900000], ['Villa 2 phòng ngủ', '2 giường King', 90, 4, 2, 4, 8500000]] },
  { email: 'partner3@hovi.vn', fullName: 'Lê Minh Cường', phoneNumber: '0901234563',
    hotel: { name: 'Hovi Boutique Đà Lạt', provinceCity: 'Lâm Đồng', address: '12 Trần Hưng Đạo, Phường 10, Đà Lạt, Lâm Đồng', starRating: 4, cancellationPolicy: 'three',
      description: 'Khách sạn boutique giữa rừng thông, không gian ấm cúng, gần chợ đêm và hồ Xuân Hương.', images: ['1564501049412-61c2a3083791', '1611892440504-42a792e24d32'] },
    rooms: [['Standard Vườn thông', '1 giường đôi', 24, 2, 0, 12, 950000], ['Superior Ban công', '1 giường Queen', 28, 2, 1, 10, 1250000], ['Family Loft', '1 giường đôi + 1 giường đơn', 40, 3, 2, 6, 1900000]] },
  { email: 'partner4@hovi.vn', fullName: 'Phạm Thu Dung', phoneNumber: '0901234564',
    hotel: { name: 'Hovi Central Sài Gòn', provinceCity: 'TP. Hồ Chí Minh', address: '120 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', starRating: 4, cancellationPolicy: 'none',
      description: 'Khách sạn trung tâm Quận 1, đi bộ tới phố đi bộ Nguyễn Huệ, quầy bar tầng thượng nhìn toàn thành phố.', images: ['1578683010236-d716f9a3f461', '1522708323590-d24dbb6b0267'] },
    rooms: [['Phòng Tiêu chuẩn', '1 giường đôi', 22, 2, 0, 25, 1100000], ['Phòng Deluxe City View', '1 giường Queen', 30, 2, 1, 15, 1650000], ['Executive Suite', '1 giường King', 48, 3, 1, 5, 3200000]] },
];

await mongoose.connect(process.env.MONGO_URL);
let n = 0;
for (const p of partners) {
  if (await User.exists({ email: p.email })) { console.log('skip (exists):', p.email); continue; }
  const user = await User.create({ email: p.email, password: '123456', fullName: p.fullName, phoneNumber: p.phoneNumber, role: 'HOTEL_PARTNER', isEmailVerified: true });
  const hotel = await Hotel.create({
    ...p.hotel, ownerId: user._id, status: 'ACTIVE', checkInTime: '14:00', checkOutTime: '12:00',
    amenities: HOTEL_AMENITIES, images: p.hotel.images.map((id, i) => ({ ...img(id), isCover: i === 0 })),
  });
  await RoomType.insertMany(p.rooms.map(([name, bedType, roomSize, adultCapacity, childrenCapacity, totalRooms, basePrice], i) => ({
    hotelId: hotel._id, name, bedType, roomSize, adultCapacity, childrenCapacity, totalRooms, basePrice,
    description: `${name} rộng ${roomSize}m², ${bedType}, đầy đủ tiện nghi.`, amenities: ROOM_AMENITIES, images: [img(ROOM_IMGS[(n + i) % ROOM_IMGS.length])],
  })));
  n++;
  console.log('created:', p.email, '->', p.hotel.name);
}
await mongoose.disconnect();
