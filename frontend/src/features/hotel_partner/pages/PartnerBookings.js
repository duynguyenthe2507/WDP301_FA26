import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner, Table } from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import TablePagination from "../components/TablePagination";
import { BOOKING_STATUS, formatDate, formatMoney, isInvalidRange, MAX_RANGE_DAYS, MESSAGES, PAYMENT_STATUS } from "../data/bookingOptions";
import { getPartnerBookings } from "../partnerApi";

const SORT_OPTIONS = [
  ["checkIn", "Ngày nhận phòng (sắp tới trước)"],
  ["bookedAt", "Ngày đặt (mới nhất)"],
  ["amount", "Số tiền (cao nhất)"],
];
const FILTER_KEYS = ["search", "status", "from", "to"];
const readFilters = (params) => Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || ""]));

const PartnerBookings = () => {
  const { token } = useContext(AuthContext);
  // Bộ lọc nằm trên URL để màn Thống kê mở được danh sách đã lọc và nút Back giữ nguyên kết quả
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getPartnerBookings({ ...readFilters(searchParams), sort: searchParams.get("sort") || "checkIn", page: searchParams.get("page") || 1 }, token)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải danh sách đặt phòng."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams, token, retryCount]);

  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const setParam = (key, value) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    return next;
  });
  const applyFilters = (event) => {
    event.preventDefault();
    // Khoảng ngày sai thì báo lỗi và giữ nguyên danh sách đang hiện
    if (isInvalidRange(filters.from, filters.to)) { setRangeError(MESSAGES.invalidRange(MAX_RANGE_DAYS)); return; }
    setRangeError("");
    const next = new URLSearchParams();
    FILTER_KEYS.forEach((key) => { if (filters[key]) next.set(key, filters[key]); });
    if (searchParams.get("sort")) next.set("sort", searchParams.get("sort"));
    setSearchParams(next);
  };
  const clearFilters = () => {
    setFilters(readFilters(new URLSearchParams()));
    setRangeError("");
    setSearchParams(new URLSearchParams());
  };
  const openBooking = (booking) => navigate(`/partner/bookings/${booking._id}`, { state: { from: location.pathname + location.search } });

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Đặt phòng</div>
      <h1 className="h3 fw-bold mb-4">Quản lý đặt phòng</h1>

      <Card className="border-0 shadow-sm rounded-4 mb-3">
        <Card.Body className="p-3">
          <Form onSubmit={applyFilters} className="row g-2 align-items-end">
            <Form.Group className="col-md-4" controlId="booking-search"><Form.Label className="small fw-semibold">Mã đặt phòng hoặc tên khách</Form.Label><div className="input-group"><span className="input-group-text bg-white"><FaSearch /></span><Form.Control name="search" value={filters.search} onChange={updateFilter} placeholder="Ví dụ: VNS2026 hoặc Nguyễn" /></div></Form.Group>
            <Form.Group className="col-md-2" controlId="booking-status"><Form.Label className="small fw-semibold">Trạng thái</Form.Label><Form.Select name="status" value={filters.status} onChange={updateFilter}><option value="">Tất cả</option><option value="NEW">Mới (chưa xác nhận nhận)</option>{Object.entries(BOOKING_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group>
            <Form.Group className="col-6 col-md-3" controlId="booking-from"><Form.Label className="small fw-semibold">Nhận phòng từ</Form.Label><Form.Control type="date" name="from" value={filters.from} onChange={updateFilter} /></Form.Group>
            <Form.Group className="col-6 col-md-3" controlId="booking-to"><Form.Label className="small fw-semibold">Đến ngày</Form.Label><Form.Control type="date" name="to" value={filters.to} onChange={updateFilter} /></Form.Group>
            <div className="col-12 d-flex flex-wrap gap-2 align-items-center">
              <Button type="submit" variant="dark" size="sm">Tìm</Button>
              <Button type="button" variant="outline-secondary" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>
              <Form.Select aria-label="Sắp xếp" size="sm" className="ms-auto w-auto" value={searchParams.get("sort") || "checkIn"} onChange={(event) => setParam("sort", event.target.value)}>{SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select>
            </div>
            {rangeError && <div className="col-12 text-danger small">{rangeError}</div>}
          </Form>
        </Card.Body>
      </Card>

      {loadError && <Alert variant="danger" className="d-flex justify-content-between align-items-center">{loadError}<Button size="sm" variant="outline-danger" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</Button></Alert>}
      {loading && !result && <div className="text-center p-5"><Spinner /></div>}
      {result && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ opacity: loading ? 0.6 : 1 }}>
          <Table responsive hover className="align-middle mb-0 small">
            <thead className="table-light"><tr><th>Mã đặt phòng</th><th>Khách</th><th>Loại phòng</th><th>Số phòng</th><th>Nhận / trả phòng</th><th className="text-end">Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {result.bookings.map((booking) => (
                <tr key={booking._id} role="button" onClick={() => openBooking(booking)}>
                  <td className="text-nowrap"><Button variant="link" className="p-0 fw-semibold text-dark small" onClick={(event) => { event.stopPropagation(); openBooking(booking); }}>{booking.bookingCode}</Button></td>
                  <td>{booking.guestName}</td>
                  <td>{booking.roomTypeName}</td>
                  <td>{booking.quantity}</td>
                  <td className="text-nowrap">{formatDate(booking.checkInDate)}<br /><span className="text-muted">{formatDate(booking.checkOutDate)}</span></td>
                  <td className="text-end text-nowrap">{formatMoney(booking.totalAmount)}</td>
                  <td>{PAYMENT_STATUS[booking.paymentStatus]}</td>
                  <td>
                    <Badge bg={BOOKING_STATUS[booking.bookingStatus].bg} className="fw-normal">{BOOKING_STATUS[booking.bookingStatus].label}</Badge>
                    {booking.isNew && <Badge bg="warning" text="dark" className="fw-normal ms-1">Mới</Badge>}
                    {booking.ackOverdue && <div className="text-danger small mt-1">Quá hạn xác nhận</div>}
                  </td>
                </tr>
              ))}
              {!result.bookings.length && <tr><td colSpan="8" className="text-center text-muted py-5">{MESSAGES.NO_BOOKINGS}</td></tr>}
            </tbody>
          </Table>
          {result.pagination.totalPages > 1 && <Card.Footer className="bg-white"><TablePagination pagination={result.pagination} onChange={(page) => setParam("page", String(page))} /></Card.Footer>}
        </Card>
      )}
    </div>
  );
};

export default PartnerBookings;
