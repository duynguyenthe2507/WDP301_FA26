// DỮ LIỆU MẪU cho màn Quản lý đặt phòng khi chưa có API; xóa file này khi có API thật.
// Sinh theo ngày hiện tại với seed cố định để các trạng thái và thao tác luôn có đủ ví dụ.
export const toDateStr = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
export const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toDateStr(new Date(y, m - 1, d + days));
};

export const MOCK_HOTELS = [
  { _id: "hotel-1", name: "VinaStay Riverside Hà Nội", cancellationPolicy: "three" },
  { _id: "hotel-2", name: "VinaStay Beach Đà Nẵng", cancellationPolicy: "one" },
];

const MOCK_ROOM_TYPES = [
  { _id: "room-1", hotelId: "hotel-1", name: "Phòng Đôi Deluxe", basePrice: 1200000 },
  { _id: "room-2", hotelId: "hotel-1", name: "Phòng Superior", basePrice: 850000 },
  { _id: "room-3", hotelId: "hotel-1", name: "Phòng Suite Junior", basePrice: 2400000 },
  { _id: "room-4", hotelId: "hotel-2", name: "Phòng Gia đình", basePrice: 1800000 },
  { _id: "room-5", hotelId: "hotel-2", name: "Căn hộ Studio", basePrice: 1450000 },
];

const GUESTS = ["Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Thu Hà", "Phạm Đức Long", "Hoàng Mai Linh", "Vũ Hải Nam", "Đặng Thảo Vy", "Bùi Gia Huy", "Đỗ Khánh Ly", "Ngô Tuấn Kiệt", "Emily Carter", "Kenji Sato"];
const REQUESTS = ["", "", "", "Nhận phòng muộn sau 22:00", "Phòng tầng cao, yên tĩnh", "Chuẩn bị thêm 1 giường phụ"];

// Bộ sinh số giả ngẫu nhiên có seed để mỗi lần tải đều ra cùng dữ liệu
let seed = 20261104;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];

let counter = 0;
const makeBooking = ({ offset, nights = 1 + Math.floor(random() * 4), roomType = pick(MOCK_ROOM_TYPES), status, acknowledged = true, cancellationRequest = null, refundAmount = 0, guestName = pick(GUESTS) }) => {
  counter += 1;
  const today = toDateStr(new Date());
  const hotel = MOCK_HOTELS.find((item) => item._id === roomType.hotelId);
  const checkInDate = addDays(today, offset);
  const quantity = random() < 0.25 ? 2 : 1;
  const subtotal = roomType.basePrice * nights * quantity;
  const taxAndFees = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + taxAndFees;
  const adultsCount = quantity * (1 + Math.ceil(random() * 1.5));
  const createdAt = `${addDays(checkInDate, -(2 + Math.floor(random() * 25)))}T09:30:00`;
  const history = [{ status: "CONFIRMED", at: createdAt, actor: "Hệ thống", note: "Thanh toán VNPAY thành công" }];
  if (status === "COMPLETED") history.push({ status: "COMPLETED", at: `${addDays(checkInDate, nights)}T12:00:00`, actor: "Hệ thống", note: "Đã qua ngày trả phòng" });
  if (status === "CANCELLED") history.push({ status: "CANCELLED", at: `${addDays(checkInDate, -1)}T10:00:00`, actor: "Khách hàng", note: "Thay đổi kế hoạch" });

  return {
    _id: `booking-${counter}`,
    bookingCode: `VNS${checkInDate.replace(/-/g, "")}${String(1000 + counter)}`,
    hotelId: hotel._id,
    hotelName: hotel.name,
    roomTypeId: roomType._id,
    roomTypeName: roomType.name,
    quantity,
    checkInDate,
    checkOutDate: addDays(checkInDate, nights),
    totalNights: nights,
    createdAt,
    guestName,
    guestPhone: `09${String(10000000 + counter * 7919).slice(0, 8)}`,
    guestEmail: `khach${counter}@example.com`,
    adultsCount,
    childrenCount: random() < 0.3 ? 1 : 0,
    specialRequests: pick(REQUESTS),
    pricePerNight: roomType.basePrice,
    subtotal,
    taxAndFees,
    totalAmount,
    cancellationPolicy: hotel.cancellationPolicy,
    paymentStatus: status === "CANCELLED" && refundAmount > 0 ? "REFUNDED" : "PAID",
    bookingStatus: status,
    acknowledged,
    cancellationRequest,
    refundAmount,
    cancellationFee: status === "CANCELLED" ? totalAmount - refundAmount : 0,
    history,
  };
};

export const buildMockBookings = () => {
  const bookings = [
    // Các ví dụ cố định: mỗi thao tác trên màn chi tiết đều có ít nhất một đơn để thử
    makeBooking({ offset: 6, status: "CONFIRMED", acknowledged: false, guestName: "Nguyễn Minh Anh" }),
    makeBooking({ offset: 12, status: "CONFIRMED", acknowledged: false, guestName: "Emily Carter" }),
    makeBooking({ offset: -1, nights: 3, status: "CONFIRMED", guestName: "Lê Thu Hà" }),
    makeBooking({ offset: 15, status: "CONFIRMED", guestName: "Hoàng Mai Linh", cancellationRequest: { status: "PENDING", reason: "Thay đổi lịch công tác", requestedAt: new Date().toISOString() } }),
    makeBooking({ offset: 1, status: "CONFIRMED", guestName: "Vũ Hải Nam", cancellationRequest: { status: "PENDING", reason: "Gia đình có việc đột xuất", requestedAt: new Date().toISOString() } }),
  ];
  for (let i = 0; i < 190; i += 1) {
    const offset = -125 + Math.floor(random() * 155);
    const nights = 1 + Math.floor(random() * 4);
    const roll = random();
    let status;
    // Đơn tự chuyển sang Hoàn thành sau ngày trả phòng
    if (offset + nights < 0) status = roll < 0.84 ? "COMPLETED" : "CANCELLED";
    else if (offset <= 0) status = "CONFIRMED";
    else status = roll < 0.88 ? "CONFIRMED" : "CANCELLED";
    const draft = makeBooking({ offset, nights, status, acknowledged: status !== "CONFIRMED" || offset <= 0 || random() > 0.15 });
    if (status === "CANCELLED" && random() < 0.65) {
      draft.refundAmount = draft.totalAmount;
      draft.cancellationFee = 0;
      draft.paymentStatus = "REFUNDED";
    }
    bookings.push(draft);
  }
  return bookings;
};
