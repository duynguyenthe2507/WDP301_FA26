import {
  FaCarSide,
  FaConciergeBell,
  FaDumbbell,
  FaPaw,
  FaSmokingBan,
  FaSnowflake,
  FaSpa,
  FaSwimmingPool,
  FaUtensils,
  FaWifi,
} from "react-icons/fa";

// Dùng chung cho wizard đăng ký và màn quản lý để tên tiện nghi lưu trong Hotel.amenities luôn khớp
export const HOTEL_AMENITIES = [
  ["Bể bơi", FaSwimmingPool],
  ["Bãi đỗ xe", FaCarSide],
  ["Spa", FaSpa],
  ["Không hút thuốc", FaSmokingBan],
  ["Wi-Fi miễn phí", FaWifi],
  ["Được phép đưa thú nuôi vào", FaPaw],
  ["Phòng tập", FaDumbbell],
  ["Bàn tiếp tân 24 giờ", FaConciergeBell],
  ["Máy điều hòa", FaSnowflake],
  ["Nhà hàng", FaUtensils],
];

// Dùng chung cho wizard đăng ký và màn sửa loại phòng để RoomType.bedType luôn khớp
export const BED_TYPES = [
  "1 giường đơn",
  "2 giường đơn",
  "1 giường đôi",
  "1 giường Queen",
  "1 giường King",
  "1 giường đôi + 1 giường đơn",
  "2 giường đôi",
  "2 giường Queen",
  "2 giường King",
  "Giường tầng",
];

// Giá trị khớp enum Hotel.cancellationPolicy
export const CANCELLATION_POLICIES = [
  ["one", "Có thể hoàn tiền tối đa 1 ngày trước ngày nhận phòng"],
  ["three", "Hoàn 100% nếu hủy trước 3 ngày, hoàn 50% nếu hủy trước 1 ngày so với ngày nhận phòng"],
  ["none", "Không hoàn tiền"],
];
