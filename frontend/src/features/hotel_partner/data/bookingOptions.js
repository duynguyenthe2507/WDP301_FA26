// Nhãn và định dạng dùng chung cho màn quản lý đặt phòng và thống kê
export const BOOKING_STATUS = {
  CONFIRMED: { label: "Đã xác nhận", bg: "primary" },
  COMPLETED: { label: "Hoàn thành", bg: "success" },
  CANCELLED: { label: "Đã hủy", bg: "danger" },
};

export const PAYMENT_STATUS = {
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const PAYOUT_STATUS = {
  PENDING: { label: "Chờ xử lý", bg: "secondary" },
  PROCESSING: { label: "Đang xử lý", bg: "info" },
  PAID: { label: "Đã thanh toán", bg: "success" },
  FAILED: { label: "Thất bại", bg: "danger" },
};

export const MESSAGES = {
  NO_BOOKINGS: "Không tìm thấy đặt phòng nào phù hợp.", // MSG14
  NO_STATISTICS: "Không có dữ liệu thống kê trong khoảng thời gian đã chọn.", // MSG11
  NO_PAYOUTS: "Bạn chưa có khoản thanh toán nào.", // MSG12
  invalidRange: (days) => `Khoảng thời gian không hợp lệ. Ngày kết thúc phải sau ngày bắt đầu và không vượt quá ${days} ngày.`, // MSG18
};

// Khớp giới hạn kỳ thống kê ở backend
export const MAX_RANGE_DAYS = 366;
export const isInvalidRange = (from, to) => Boolean(from && to && (to < from || (new Date(to) - new Date(from)) / 86400000 > MAX_RANGE_DAYS));

export const formatMoney = (amount) => `${new Intl.NumberFormat("vi-VN").format(Math.round(amount || 0))} đ`;
export const formatPercent = (ratio) => `${(Math.round((ratio || 0) * 1000) / 10).toLocaleString("vi-VN")}%`;
// Ngày dạng YYYY-MM-DD → DD/MM/YYYY
export const formatDate = (value) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "—");
export const formatDateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—");
