import { useCallback, useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { CANCELLATION_POLICIES } from "../data/hotelOptions";
import { BOOKING_STATUS, formatDate, formatDateTime, formatMoney, MESSAGES, PARTNER_CANCEL_REASONS, PAYMENT_STATUS } from "../data/bookingOptions";
import { acknowledgeBooking, cancelBooking, declineCancellationRequest, getPartnerBooking } from "../partnerBookingApi";

const policyLabel = (value) => CANCELLATION_POLICIES.find(([key]) => key === value)?.[1] || "—";
const REQUEST_STATUS = { PENDING: "Chờ xử lý", APPROVED: "Đã duyệt", DECLINED: "Đã từ chối" };

const PartnerBookingDetail = () => {
  const { token } = useContext(AuthContext);
  const { bookingId } = useParams();
  const location = useLocation();
  const backTo = location.state?.from || "/partner/bookings";
  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // "cancel" | "decline"
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const load = useCallback(() => getPartnerBooking(bookingId, token)
    .then(({ data }) => { setBooking(data.booking); setLoadError(""); })
    .catch((requestError) => { setBooking(null); setLoadError(requestError.response?.data?.message || "Không thể tải đặt phòng."); }), [bookingId, token]);

  useEffect(() => { load(); }, [load]);

  // Mọi thao tác: hiện thông báo và cập nhật đơn; lỗi thì tải lại để thấy trạng thái mới nhất
  const run = async (action) => {
    setBusy(true);
    setActionError("");
    setMessage("");
    try {
      const { data } = await action();
      setBooking(data.booking);
      setMessage(data.message);
      setModal(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Không thể cập nhật đặt phòng.");
      setModal(null);
      await load();
    } finally {
      setBusy(false);
    }
  };
  const openModal = (name) => { setReason(""); setNote(""); setFormError(""); setModal(name); };
  const hasCustomerRequest = booking?.cancellationRequest?.status === "PENDING";
  const confirmCancel = () => {
    if (!hasCustomerRequest && (!reason || !note.trim())) { setFormError(MESSAGES.MISSING_REASON); return; }
    run(() => cancelBooking(booking._id, { reason, note }, token));
  };
  const confirmDecline = () => {
    if (!note.trim()) { setFormError(MESSAGES.MISSING_REASON); return; }
    run(() => declineCancellationRequest(booking._id, note, token));
  };

  if (loadError && !booking) return <Alert variant="danger">{loadError} <Link to="/partner/bookings">Quay lại danh sách</Link></Alert>;
  if (!booking) return <div className="text-center p-5"><Spinner /></div>;

  const { actions, cancellation } = booking;
  const status = BOOKING_STATUS[booking.bookingStatus];
  const request = booking.cancellationRequest;

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Đặt phòng / {booking.bookingCode}</div>
      <Link to={backTo} className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại danh sách</Link>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 className="h3 fw-bold mb-0">{booking.bookingCode}</h1>
        <Badge bg={status.bg} className="fw-normal">{status.label}</Badge>
        {booking.isNew && <Badge bg="warning" text="dark">Mới</Badge>}
      </div>
      {message && <Alert variant="success" dismissible onClose={() => setMessage("")}>{message}</Alert>}
      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError("")}>{actionError}</Alert>}

      {request && (
        <Alert variant={request.status === "PENDING" ? "warning" : "light"} className={request.status === "PENDING" ? "" : "border"}>
          <strong>Yêu cầu hủy của khách · {REQUEST_STATUS[request.status]}</strong>
          <div className="small mt-1">Lý do: {request.reason} · Gửi lúc {formatDateTime(request.requestedAt)}</div>
          {request.declineReason && <div className="small">Lý do từ chối: {request.declineReason}</div>}
        </Alert>
      )}

      <div className="row g-3">
        <div className="col-lg-8">
          <Section title="Thông tin khách">
            <div className="row g-2 small">
              <Info label="Họ tên" value={booking.guestName} />
              <Info label="Số điện thoại" value={booking.guestPhone} />
              <Info label="Email" value={booking.guestEmail} />
              <Info label="Số khách" value={`${booking.adultsCount} người lớn${booking.childrenCount ? `, ${booking.childrenCount} trẻ em` : ""}`} />
            </div>
          </Section>
          <Section title="Thông tin lưu trú">
            <div className="row g-2 small">
              <Info label="Khách sạn" value={booking.hotelName} />
              <Info label="Loại phòng" value={`${booking.roomTypeName} × ${booking.quantity}`} />
              <Info label="Nhận phòng" value={formatDate(booking.checkInDate)} />
              <Info label="Trả phòng" value={`${formatDate(booking.checkOutDate)} (${booking.totalNights} đêm)`} />
              <Info label="Ngày đặt" value={formatDateTime(booking.createdAt)} />
              <Info label="Chính sách hủy áp dụng" value={policyLabel(booking.cancellationPolicy)} />
              <div className="col-12"><div className="text-muted">Yêu cầu đặc biệt</div><div>{booking.specialRequests || "Không có"}</div></div>
            </div>
          </Section>
          <Section title="Lịch sử trạng thái">
            <ul className="list-unstyled small mb-0">
              {[...booking.history].reverse().map((item, index) => (
                <li key={`${item.at}-${index}`} className="border-start border-2 ps-3 pb-3">
                  <div className="fw-semibold">{BOOKING_STATUS[item.status]?.label || item.status}</div>
                  <div className="text-muted">{formatDateTime(item.at)} · {item.actor}</div>
                  {item.note && <div>{item.note}</div>}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="col-lg-4">
          <Section title="Thanh toán">
            <div className="small">
              <Row label={`${formatMoney(booking.pricePerNight)} × ${booking.totalNights} đêm × ${booking.quantity} phòng`} value={formatMoney(booking.subtotal)} />
              <Row label="Thuế và phí (10%)" value={formatMoney(booking.taxAndFees)} />
              <Row label={<strong>Tổng cộng</strong>} value={<strong>{formatMoney(booking.totalAmount)}</strong>} />
              <Row label="Trạng thái" value={PAYMENT_STATUS[booking.paymentStatus]} />
              {booking.bookingStatus === "CANCELLED" && <><Row label="Đã hoàn cho khách" value={formatMoney(booking.refundAmount)} /><Row label="Phí hủy giữ lại" value={formatMoney(booking.cancellationFee)} /></>}
            </div>
          </Section>
          <Section title="Thao tác">
            <div className="d-grid gap-2">
              {actions.acknowledge && <Button variant="dark" disabled={busy} onClick={() => run(() => acknowledgeBooking(booking._id, token))}>Xác nhận đã nhận</Button>}
              {actions.declineRequest && <Button variant="outline-dark" disabled={busy} onClick={() => openModal("decline")}>Từ chối yêu cầu hủy</Button>}
              {actions.cancel && <Button variant="outline-danger" disabled={busy} onClick={() => openModal("cancel")}>{hasCustomerRequest ? "Duyệt yêu cầu hủy" : actions.acknowledge ? "Không thể phục vụ" : "Hủy đặt phòng"}</Button>}
              {!Object.values(actions).some(Boolean) && <div className="small text-muted">Không có thao tác nào cho trạng thái này.</div>}
            </div>
          </Section>
        </div>
      </div>

      <Modal show={modal === "cancel"} onHide={() => setModal(null)} centered>
        <Modal.Header closeButton><Modal.Title className="h5">{hasCustomerRequest ? "Duyệt yêu cầu hủy" : "Hủy đặt phòng"} {booking.bookingCode}</Modal.Title></Modal.Header>
        <Modal.Body>
          {hasCustomerRequest && <p className="small mb-2">Lý do của khách: {request.reason}</p>}
          <p className="small text-muted">Chính sách áp dụng: {policyLabel(booking.cancellationPolicy)}{cancellation.deadline && ` (hạn hoàn tiền: ${formatDateTime(cancellation.deadline)})`}</p>
          <div className="small bg-light rounded-3 p-3 mb-3">
            <Row label="Khách đã thanh toán" value={formatMoney(cancellation.paidAmount)} />
            <Row label="Hoàn cho khách" value={<strong>{formatMoney(cancellation.refundAmount)}</strong>} />
            <Row label="Phí hủy" value={formatMoney(cancellation.cancellationFee)} />
          </div>
          {!hasCustomerRequest && (
            <>
              <p className="small">Đối tác chủ động hủy nên khách được hoàn 100%, và yêu cầu sẽ được chuyển để quản lý vận hành xem xét.</p>
              <Form.Group className="mb-2" controlId="cancel-reason"><Form.Label className="small fw-semibold">Lý do hủy <span className="text-danger">*</span></Form.Label><Form.Select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Chọn lý do</option>{PARTNER_CANCEL_REASONS.map((item) => <option key={item}>{item}</option>)}</Form.Select></Form.Group>
              <Form.Group controlId="cancel-note"><Form.Label className="small fw-semibold">Ghi chú <span className="text-danger">*</span></Form.Label><Form.Control as="textarea" rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></Form.Group>
            </>
          )}
          {formError && <div className="text-danger small mt-2">{formError}</div>}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setModal(null)}>Giữ đặt phòng</Button><Button variant="danger" disabled={busy} onClick={confirmCancel}>Xác nhận hủy</Button></Modal.Footer>
      </Modal>

      <Modal show={modal === "decline"} onHide={() => setModal(null)} centered>
        <Modal.Header closeButton><Modal.Title className="h5">Từ chối yêu cầu hủy</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="small">Đơn vẫn ở trạng thái Đã xác nhận và khách sẽ nhận được lý do bạn nhập.</p>
          <Form.Group controlId="decline-reason"><Form.Label className="small fw-semibold">Lý do từ chối <span className="text-danger">*</span></Form.Label><Form.Control as="textarea" rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></Form.Group>
          {formError && <div className="text-danger small mt-2">{formError}</div>}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setModal(null)}>Quay lại</Button><Button variant="dark" disabled={busy} onClick={confirmDecline}>Từ chối</Button></Modal.Footer>
      </Modal>
    </div>
  );
};

const Section = ({ title, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-3">{title}</h2>{children}</Card.Body></Card>;
const Info = ({ label, value }) => <div className="col-sm-6"><div className="text-muted">{label}</div><div>{value}</div></div>;
const Row = ({ label, value }) => <div className="d-flex justify-content-between gap-3 py-1"><span className="text-muted">{label}</span><span className="text-end text-nowrap">{value}</span></div>;

export default PartnerBookingDetail;
