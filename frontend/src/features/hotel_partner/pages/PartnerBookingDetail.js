import { useCallback, useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { CANCELLATION_POLICIES } from "../data/hotelOptions";
import { BOOKING_STATUS, formatDate, formatDateTime, formatMoney, PAYMENT_STATUS } from "../data/bookingOptions";
import { acknowledgeBooking, cancelPartnerBooking, getPartnerBooking } from "../partnerApi";

const policyLabel = (value) => CANCELLATION_POLICIES.find(([key]) => key === value)?.[1] || "—";
const REFUND_STATUS = { NOT_APPLICABLE: "Không áp dụng", PENDING: "Đang xử lý", PROCESSED: "Đã hoàn tiền" };
const INITIATORS = [
  ["CUSTOMER", "Khách yêu cầu hủy", "Khách liên hệ khách sạn nhờ hủy hộ. Hoàn tiền theo chính sách hủy của đơn."],
  ["HOTEL", "Khách sạn không phục vụ được", "Phòng hỏng, hết phòng, khách sạn tạm đóng cửa… Khách được hoàn 100%, không thu phí."],
];
const EMPTY_CANCEL_FORM = { initiator: "", reason: "", note: "", waiveFee: false };
const historyLabel = (item) => (item.event === "ACKNOWLEDGED" ? "Khách sạn xác nhận đã nhận" : BOOKING_STATUS[item.status].label);

const PartnerBookingDetail = () => {
  const { token } = useContext(AuthContext);
  const { bookingId } = useParams();
  const location = useLocation();
  const backTo = location.state?.from || "/partner/bookings";
  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [cancelForm, setCancelForm] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = useCallback(() => getPartnerBooking(bookingId, token)
    .then(({ data }) => setBooking(data.booking))
    .catch((requestError) => setLoadError(requestError.response?.data?.message || "Không thể tải đặt phòng.")), [bookingId, token]);

  useEffect(() => {
    setBooking(null);
    setLoadError("");
    setNotice(null);
    loadBooking();
  }, [loadBooking]);

  const acknowledge = async () => {
    setAcknowledging(true);
    setNotice(null);
    try {
      const { data } = await acknowledgeBooking(booking._id, token);
      setNotice({ variant: "success", text: data.message });
    } catch (requestError) {
      setNotice({ variant: "danger", text: requestError.response?.data?.message || "Không thể xác nhận nhận đơn." });
    }
    await loadBooking();
    setAcknowledging(false);
  };

  const openCancel = (initiator = "") => {
    setCancelForm({ ...EMPTY_CANCEL_FORM, initiator });
    setCancelError("");
  };
  const updateCancelForm = (changes) => {
    setCancelForm((current) => ({ ...current, ...changes }));
    setCancelError("");
  };
  const submitCancel = async (event) => {
    event.preventDefault();
    if (!cancelForm.initiator) { setCancelError("Vui lòng chọn ai muốn hủy đặt phòng."); return; }
    if (!cancelForm.reason || !cancelForm.note.trim()) { setCancelError("Vui lòng chọn lý do và nhập ghi chú."); return; } // MSG17
    setCancelling(true);
    try {
      const { data } = await cancelPartnerBooking(booking._id, { ...cancelForm, note: cancelForm.note.trim() }, token);
      setCancelForm(null);
      setNotice({ variant: "success", text: data.message });
      await loadBooking();
    } catch (requestError) {
      setCancelError(requestError.response?.data?.message || "Không thể hủy đặt phòng.");
      // Đơn đã đổi trạng thái ở nơi khác thì tải lại để partner thấy trạng thái hiện tại
      if (requestError.response?.status === 409) await loadBooking();
    }
    setCancelling(false);
  };

  if (loadError) return <Alert variant="danger">{loadError} <Link to="/partner/bookings">Quay lại danh sách</Link></Alert>;
  if (!booking) return <div className="text-center p-5"><Spinner /></div>;

  const status = BOOKING_STATUS[booking.bookingStatus];
  const { cancellation, cancelOptions } = booking;
  const showActions = booking.isNew || booking.canCancel;

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Đặt phòng / {booking.bookingCode}</div>
      <Link to={backTo} className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại</Link>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 className="h3 fw-bold mb-0">{booking.bookingCode}</h1>
        <Badge bg={status.bg} className="fw-normal">{status.label}</Badge>
        {booking.isNew && <Badge bg="warning" text="dark" className="fw-normal">Mới</Badge>}
      </div>
      {notice && <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <div className="row g-3">
        <div className="col-lg-8">
          <Section title="Thông tin khách">
            <div className="row g-2 small">
              <Info label="Người đặt" value={booking.bookerFullName} />
              <Info label="Số điện thoại người đặt" value={booking.bookerPhone} />
              <Info label="Email người đặt" value={booking.bookerEmail} />
              <Info label="Số khách" value={`${booking.adultsCount} người lớn${booking.childrenCount ? `, ${booking.childrenCount} trẻ em` : ""}`} />
              {!booking.isSelfGuest && <><Info label="Khách nhận phòng" value={booking.guestFullName || "—"} /><Info label="Số điện thoại khách nhận phòng" value={booking.guestPhone || "—"} /></>}
            </div>
          </Section>
          <Section title="Thông tin lưu trú">
            <div className="row g-2 small mb-3">
              <Info label="Nhận phòng" value={formatDate(booking.checkInDate)} />
              <Info label="Trả phòng" value={`${formatDate(booking.checkOutDate)} (${booking.totalNights} đêm)`} />
              <Info label="Ngày đặt" value={formatDateTime(booking.createdAt)} />
              <Info label="Chính sách hủy áp dụng" value={policyLabel(booking.cancellationPolicy)} />
              <div className="col-12"><div className="text-muted">Yêu cầu đặc biệt</div><div>{booking.specialRequests || "Không có"}</div></div>
            </div>
            <Table responsive size="sm" className="align-middle mb-0 small">
              <thead className="table-light"><tr><th>Loại phòng</th><th className="text-end">Số phòng</th><th className="text-end">Giá / đêm</th><th className="text-end">Thành tiền</th></tr></thead>
              <tbody>{booking.lines.map((line) => <tr key={line._id}><td>{line.roomTypeName}</td><td className="text-end">{line.quantity}</td><td className="text-end text-nowrap">{formatMoney(line.pricePerNight)}</td><td className="text-end text-nowrap">{formatMoney(line.totalPrice)}</td></tr>)}</tbody>
            </Table>
          </Section>
          <Section title="Lịch sử trạng thái">
            <ul className="list-unstyled small mb-0">
              {[...booking.history].reverse().map((item, index) => (
                <li key={`${item.status}-${item.event || ""}-${index}`} className="border-start border-2 ps-3 pb-3">
                  <div className="fw-semibold">{historyLabel(item)}</div>
                  <div className="text-muted">{formatDateTime(item.at)}</div>
                  {item.note && <div>{item.note}</div>}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="col-lg-4">
          {showActions && (
            <Section title="Xử lý đặt phòng">
              {booking.isNew && (
                <>
                  <p className="small text-muted mb-2">Đơn mới đã được khách thanh toán. Kiểm tra phòng có thể cung cấp cho ngày lưu trú rồi xác nhận đã nhận đơn.</p>
                  {booking.ackOverdue && <Alert variant="warning" className="small py-2">Đơn đã quá hạn xác nhận.</Alert>}
                  <div className="d-grid gap-2 mb-2">
                    <Button variant="dark" size="sm" disabled={acknowledging} onClick={acknowledge}>{acknowledging ? "Đang xác nhận…" : "Xác nhận đã nhận"}</Button>
                    {booking.canCancel && <Button variant="outline-danger" size="sm" onClick={() => openCancel("HOTEL")}>Không thể phục vụ</Button>}
                  </div>
                </>
              )}
              {!booking.isNew && booking.canCancel && (
                <>
                  <p className="small text-muted mb-2">Đã xác nhận nhận đơn lúc {formatDateTime(booking.acknowledgedAt)}.</p>
                  <div className="d-grid"><Button variant="outline-danger" size="sm" onClick={() => openCancel()}>Hủy đặt phòng</Button></div>
                </>
              )}
              {booking.isNew && !booking.canCancel && <p className="small text-muted mb-0">Đã qua ngày nhận phòng nên không thể hủy đơn.</p>}
            </Section>
          )}
          <Section title="Thanh toán">
            <div className="small">
              <Row label="Tiền phòng" value={formatMoney(booking.subtotal)} />
              <Row label="Thuế và phí" value={formatMoney(booking.taxAndFees)} />
              <Row label={<strong>Tổng cộng</strong>} value={<strong>{formatMoney(booking.totalAmount)}</strong>} />
              <Row label="Trạng thái" value={PAYMENT_STATUS[booking.paymentStatus]} />
              {booking.paidAt && <Row label="Thanh toán lúc" value={formatDateTime(booking.paidAt)} />}
            </div>
          </Section>
          {cancellation && (
            <Section title="Thông tin hủy">
              <div className="small">
                <Row label="Người hủy" value={cancellation.cancelledBy === "PARTNER" ? "Khách sạn" : "Khách hàng"} />
                <Row label="Hủy lúc" value={formatDateTime(cancellation.cancelledAt)} />
                <Row label="Hoàn cho khách" value={formatMoney(cancellation.refundAmount)} />
                <Row label="Phí hủy giữ lại" value={formatMoney(cancellation.cancellationFee)} />
                <Row label="Hoàn tiền" value={REFUND_STATUS[cancellation.refundStatus]} />
                <div className="mt-2"><div className="text-muted">Lý do</div><div>{cancellation.reason}</div></div>
                {cancellation.note && <div className="mt-2"><div className="text-muted">Ghi chú</div><div>{cancellation.note}</div></div>}
              </div>
            </Section>
          )}
        </div>
      </div>

      <Modal show={Boolean(cancelForm)} onHide={() => !cancelling && setCancelForm(null)} centered>
        {cancelForm && cancelOptions && (
          <Form onSubmit={submitCancel}>
            <Modal.Header closeButton={!cancelling}><Modal.Title className="h5">Hủy đặt phòng {booking.bookingCode}</Modal.Title></Modal.Header>
            <Modal.Body className="small">
              <div className="text-muted mb-3">{booking.bookerFullName} · {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)} · Đã thanh toán {formatMoney(cancelOptions.paidAmount)}</div>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Ai muốn hủy đặt phòng? *</Form.Label>
                {INITIATORS.map(([value, label, hint]) => (
                  <Form.Check key={value} type="radio" id={`initiator-${value}`} name="initiator" className="mb-2"
                    checked={cancelForm.initiator === value} onChange={() => updateCancelForm({ initiator: value, reason: "", waiveFee: false })}
                    label={<><span className="fw-semibold">{label}</span><div className="text-muted">{hint}</div></>} />
                ))}
              </Form.Group>
              {cancelForm.initiator && (
                <>
                  <Form.Group className="mb-3" controlId="cancel-reason">
                    <Form.Label className="fw-semibold">Lý do *</Form.Label>
                    <Form.Select value={cancelForm.reason} onChange={(event) => updateCancelForm({ reason: event.target.value })}>
                      <option value="">Chọn lý do</option>
                      {cancelOptions.reasons[cancelForm.initiator].map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="cancel-note">
                    <Form.Label className="fw-semibold">Ghi chú *</Form.Label>
                    <Form.Control as="textarea" rows={3} maxLength={1000} value={cancelForm.note} onChange={(event) => updateCancelForm({ note: event.target.value })}
                      placeholder={cancelForm.initiator === "CUSTOMER" ? "Khách liên hệ qua kênh nào, lúc nào, nội dung yêu cầu…" : "Mô tả sự cố và hướng xử lý với khách…"} />
                  </Form.Group>
                  {cancelForm.initiator === "CUSTOMER" && (
                    <>
                      <div className="text-muted mb-2">Chính sách hủy: {cancelOptions.policyRefund.description}</div>
                      <Form.Check type="checkbox" id="cancel-waive-fee" className="mb-3" checked={cancelForm.waiveFee}
                        onChange={(event) => updateCancelForm({ waiveFee: event.target.checked })} label="Miễn phí hủy, hoàn 100% cho khách" />
                    </>
                  )}
                  <RefundPreview form={cancelForm} options={cancelOptions} />
                </>
              )}
              {cancelError && <Alert variant="danger" className="small py-2 mt-3 mb-0">{cancelError}</Alert>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" size="sm" disabled={cancelling} onClick={() => setCancelForm(null)}>Giữ đặt phòng</Button>
              <Button type="submit" variant="danger" size="sm" disabled={cancelling}>{cancelling ? "Đang hủy…" : "Xác nhận hủy"}</Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </div>
  );
};

const RefundPreview = ({ form, options }) => {
  const fullRefund = form.initiator === "HOTEL" || form.waiveFee;
  const refundAmount = fullRefund ? options.paidAmount : options.policyRefund.refundAmount;
  return (
    <div className="bg-light rounded-3 p-2">
      <Row label="Khách đã thanh toán" value={formatMoney(options.paidAmount)} />
      <Row label="Phí hủy" value={formatMoney(options.paidAmount - refundAmount)} />
      <Row label={<strong>Hoàn cho khách</strong>} value={<strong>{formatMoney(refundAmount)}</strong>} />
    </div>
  );
};

const Section = ({ title, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-3">{title}</h2>{children}</Card.Body></Card>;
const Info = ({ label, value }) => <div className="col-sm-6"><div className="text-muted">{label}</div><div>{value}</div></div>;
const Row = ({ label, value }) => <div className="d-flex justify-content-between gap-3 py-1"><span className="text-muted">{label}</span><span className="text-end text-nowrap">{value}</span></div>;

export default PartnerBookingDetail;
