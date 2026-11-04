// API GIẢ LẬP cho màn Quản lý đặt phòng: chạy trong bộ nhớ, tải lại trang là mất thay đổi.
// Hàm nào cũng trả về { data } hoặc reject { response: { data: { message } } } giống axios,
// nên khi có backend chỉ cần thay thân hàm bằng lời gọi axios như partnerApi.js, các trang không phải sửa.
import { addDays, buildMockBookings, MOCK_HOTELS, toDateStr } from "./data/mockPartnerBookings";
import { isInvalidRange, MAX_RANGE_DAYS, MESSAGES } from "./data/bookingOptions";

const bookings = buildMockBookings();
const PAGE_SIZE = 10;

const respond = (data) => new Promise((resolve) => { setTimeout(() => resolve({ data }), 250); });
const fail = (message, status = 400) => new Promise((_, reject) => {
  setTimeout(() => reject({ response: { status, data: { message } } }), 250);
});
const paginate = (items, page, limit = PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  return { items: items.slice((current - 1) * limit, current * limit), pagination: { page: current, totalPages, total: items.length } };
};
const today = () => toDateStr(new Date());

const REFUND_DAYS = { one: 1, three: 3, none: null };

// Cùng công thức với calculateCancellationDetails ở backend: trong hạn hoàn 100%, quá hạn không hoàn
const cancellationPreview = (booking) => {
  const paid = booking.paymentStatus === "PAID" ? booking.totalAmount : 0;
  const days = REFUND_DAYS[booking.cancellationPolicy];
  const deadline = days === null ? null : `${addDays(booking.checkInDate, -days)}T14:00:00`;
  const withinWindow = Boolean(deadline) && new Date() <= new Date(deadline);
  const hasCustomerRequest = booking.cancellationRequest?.status === "PENDING";
  // Đối tác tự hủy thì luôn hoàn 100% (BR-53)
  const refundAmount = !hasCustomerRequest || withinWindow ? paid : 0;
  return { paidAmount: paid, refundAmount, cancellationFee: paid - refundAmount, deadline, withinWindow };
};

const availableActions = (booking) => {
  const confirmed = booking.bookingStatus === "CONFIRMED";
  return {
    acknowledge: confirmed && !booking.acknowledged,
    cancel: confirmed,
    declineRequest: confirmed && booking.cancellationRequest?.status === "PENDING" && !cancellationPreview(booking).withinWindow,
  };
};

const toListItem = ({ guestPhone, guestEmail, history, ...booking }) => ({
  ...booking,
  isNew: booking.bookingStatus === "CONFIRMED" && !booking.acknowledged,
});
const toDetail = (booking) => ({
  ...toListItem(booking),
  guestPhone: booking.guestPhone,
  guestEmail: booking.guestEmail,
  history: booking.history,
  actions: availableActions(booking),
  cancellation: cancellationPreview(booking),
});

const SORTERS = {
  // Đơn sắp nhận phòng trước, rồi đến đơn đã qua (gần nhất trước)
  checkIn: (a, b) => {
    const now = today();
    const aUpcoming = a.checkInDate >= now;
    const bUpcoming = b.checkInDate >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? a.checkInDate.localeCompare(b.checkInDate) : b.checkInDate.localeCompare(a.checkInDate);
  },
  bookedAt: (a, b) => b.createdAt.localeCompare(a.createdAt),
  amount: (a, b) => b.totalAmount - a.totalAmount,
};

export const getPartnerHotels = (token) => respond({ hotels: MOCK_HOTELS });

export const getPartnerBookings = ({ search = "", hotelId = "", status = "", from = "", to = "", sort = "checkIn", page = 1 } = {}, token) => {
  if (isInvalidRange(from, to)) return fail(MESSAGES.invalidRange(MAX_RANGE_DAYS));
  const keyword = search.trim().toLowerCase();
  const matched = bookings
    .filter((b) => !hotelId || b.hotelId === hotelId)
    .filter((b) => !status || b.bookingStatus === status)
    .filter((b) => (!from || b.checkInDate >= from) && (!to || b.checkInDate <= to))
    .filter((b) => !keyword || b.bookingCode.toLowerCase().includes(keyword) || b.guestName.toLowerCase().includes(keyword))
    .sort(SORTERS[sort] || SORTERS.checkIn);
  const { items, pagination } = paginate(matched, page);
  return respond({ bookings: items.map(toListItem), pagination });
};

const findBooking = (id) => bookings.find((b) => b._id === id);
const notFound = () => fail("Không tìm thấy đặt phòng.", 404);
const CHANGED = "Không thể thực hiện thao tác này với trạng thái hiện tại của đặt phòng.";

export const getPartnerBooking = (id, token) => {
  const booking = findBooking(id);
  return booking ? respond({ booking: toDetail(booking) }) : notFound();
};

const addHistory = (booking, status, note = "") => booking.history.push({ status, at: new Date().toISOString(), actor: "Đối tác khách sạn", note });

export const acknowledgeBooking = (id, token) => {
  const booking = findBooking(id);
  if (!booking) return notFound();
  if (!availableActions(booking).acknowledge) return fail(CHANGED, 409);
  booking.acknowledged = true;
  addHistory(booking, booking.bookingStatus, "Đối tác xác nhận đã nhận đặt phòng");
  return respond({ message: `Đã xác nhận nhận đặt phòng ${booking.bookingCode}.`, booking: toDetail(booking) });
};

export const cancelBooking = (id, { reason = "", note = "" } = {}, token) => {
  const booking = findBooking(id);
  if (!booking) return notFound();
  if (booking.bookingStatus !== "CONFIRMED") return fail("Không thể hủy đặt phòng này vì đặt phòng không ở trạng thái Đã xác nhận.", 409);
  const hasCustomerRequest = booking.cancellationRequest?.status === "PENDING";
  if (!hasCustomerRequest && (!reason || !note.trim())) return fail(MESSAGES.MISSING_REASON);
  const { refundAmount, cancellationFee } = cancellationPreview(booking);
  booking.bookingStatus = "CANCELLED";
  booking.acknowledged = true;
  booking.refundAmount = refundAmount;
  booking.cancellationFee = cancellationFee;
  if (refundAmount > 0) booking.paymentStatus = "REFUNDED";
  if (hasCustomerRequest) booking.cancellationRequest.status = "APPROVED";
  addHistory(booking, "CANCELLED", hasCustomerRequest ? `Duyệt yêu cầu hủy của khách: ${booking.cancellationRequest.reason}` : `${reason}: ${note.trim()}`);
  return respond({ message: `Đã hủy đặt phòng ${booking.bookingCode}. Khách hàng sẽ được thông báo.`, booking: toDetail(booking) });
};

export const declineCancellationRequest = (id, reason, token) => {
  const booking = findBooking(id);
  if (!booking) return notFound();
  if (!availableActions(booking).declineRequest) return fail(CHANGED, 409);
  if (!reason?.trim()) return fail(MESSAGES.MISSING_REASON);
  booking.cancellationRequest.status = "DECLINED";
  booking.cancellationRequest.declineReason = reason.trim();
  addHistory(booking, booking.bookingStatus, `Từ chối yêu cầu hủy: ${reason.trim()}`);
  return respond({ message: "Đã từ chối yêu cầu hủy. Khách hàng sẽ được thông báo.", booking: toDetail(booking) });
};
