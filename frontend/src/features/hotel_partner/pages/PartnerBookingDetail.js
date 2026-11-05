import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Card, Spinner, Table } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { CANCELLATION_POLICIES } from "../data/hotelOptions";
import { BOOKING_STATUS, formatDate, formatDateTime, formatMoney, PAYMENT_STATUS } from "../data/bookingOptions";
import { getPartnerBooking } from "../partnerApi";

const policyLabel = (value) => CANCELLATION_POLICIES.find(([key]) => key === value)?.[1] || "—";
const REFUND_STATUS = { NOT_APPLICABLE: "Không áp dụng", PENDING: "Đang xử lý", PROCESSED: "Đã hoàn tiền" };

const PartnerBookingDetail = () => {
  const { token } = useContext(AuthContext);
  const { bookingId } = useParams();
  const location = useLocation();
  const backTo = location.state?.from || "/partner/bookings";
  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setBooking(null);
    setLoadError("");
    getPartnerBooking(bookingId, token)
      .then(({ data }) => { if (active) setBooking(data.booking); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải đặt phòng."); });
    return () => { active = false; };
  }, [bookingId, token]);

  if (loadError) return <Alert variant="danger">{loadError} <Link to="/partner/bookings">Quay lại danh sách</Link></Alert>;
  if (!booking) return <div className="text-center p-5"><Spinner /></div>;

  const status = BOOKING_STATUS[booking.bookingStatus];
  const { cancellation } = booking;

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Đặt phòng / {booking.bookingCode}</div>
      <Link to={backTo} className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại</Link>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 className="h3 fw-bold mb-0">{booking.bookingCode}</h1>
        <Badge bg={status.bg} className="fw-normal">{status.label}</Badge>
      </div>

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
              {[...booking.history].reverse().map((item) => (
                <li key={item.status} className="border-start border-2 ps-3 pb-3">
                  <div className="fw-semibold">{BOOKING_STATUS[item.status].label}</div>
                  <div className="text-muted">{formatDateTime(item.at)}</div>
                  {item.note && <div>{item.note}</div>}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="col-lg-4">
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
    </div>
  );
};

const Section = ({ title, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-3">{title}</h2>{children}</Card.Body></Card>;
const Info = ({ label, value }) => <div className="col-sm-6"><div className="text-muted">{label}</div><div>{value}</div></div>;
const Row = ({ label, value }) => <div className="d-flex justify-content-between gap-3 py-1"><span className="text-muted">{label}</span><span className="text-end text-nowrap">{value}</span></div>;

export default PartnerBookingDetail;
