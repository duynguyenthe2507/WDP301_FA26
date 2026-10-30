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

// Giá trị khớp enum Hotel.cancellationPolicy
export const CANCELLATION_POLICIES = [
  ["one", "Có thể hoàn tiền tối đa 1 ngày trước ngày nhận phòng"],
  ["three", "Có thể hoàn tiền tối đa 3 ngày trước ngày nhận phòng"],
  ["none", "Không hoàn tiền"],
];
