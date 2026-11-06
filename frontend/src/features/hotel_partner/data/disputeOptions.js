// Nhãn dùng chung cho danh sách và chi tiết khiếu nại phía khách sạn (khớp nhãn bên khách hàng)
export const DISPUTE_STATUS = {
  PENDING: { label: "Chờ tiếp nhận", bg: "warning", text: "dark" },
  IN_PROGRESS: { label: "Đang xử lý", bg: "primary" },
  WAITING_PARTNER: { label: "Chờ khách sạn phản hồi", bg: "danger" },
  RESOLVED: { label: "Đã giải quyết", bg: "success" },
  REJECTED: { label: "Đã bác bỏ", bg: "secondary" },
};

export const DISPUTE_CATEGORY = {
  INCORRECT_INFORMATION: "Thông tin chỗ nghỉ không đúng mô tả",
  SERVICE_QUALITY: "Chất lượng dịch vụ không đúng cam kết",
  OVERCHARGE: "Thu thêm phụ phí không công bố",
  CANCELLATION: "Sự cố hủy phòng / Không nhận được phòng",
  OTHER: "Lý do khác",
};

export const DISPUTE_OUTCOME = {
  UPHELD: "Chấp nhận khiếu nại",
  PARTIALLY_UPHELD: "Chấp nhận một phần",
  REJECTED: "Bác bỏ khiếu nại",
  NO_ACTION: "Không cần xử lý thêm",
};

export const MAX_RESPONSE_LENGTH = 2000;
