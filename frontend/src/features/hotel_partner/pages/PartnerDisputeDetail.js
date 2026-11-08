import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaPaperclip, FaPen } from "react-icons/fa";
import { Link, useLocation, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { BOOKING_STATUS, formatDate, formatDateTime, formatMoney } from "../data/bookingOptions";
import { DISPUTE_CATEGORY, DISPUTE_OUTCOME, DISPUTE_STATUS, MAX_RESPONSE_LENGTH } from "../data/disputeOptions";
import { editPartnerDisputeResponse, getPartnerDispute, respondPartnerDispute } from "../partnerApi";

const isImage = (file) => (file.fileType || "").startsWith("image/") || /^data:image\//.test(file.fileUrl);

const PartnerDisputeDetail = () => {
  const { token } = useContext(AuthContext);
  const { disputeId } = useParams();
  const location = useLocation();
  const backTo = location.state?.from || "/partner/disputes";
  const [dispute, setDispute] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null); // { index, message } của phản hồi đang sửa
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setDispute(null);
    setLoadError("");
    getPartnerDispute(disputeId, token)
      .then(({ data }) => { if (active) setDispute(data.dispute); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải khiếu nại."); });
    return () => { active = false; };
  }, [disputeId, token]);

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!message.trim()) { setFormError("Vui lòng nhập nội dung phản hồi."); return; }
    setSending(true);
    try {
      const { data } = await respondPartnerDispute(dispute._id, message.trim(), token);
      setDispute(data.dispute);
      setMessage("");
      setNotice(data.message);
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || "Không thể gửi phản hồi.");
      // Khiếu nại vừa bị đóng ở nơi khác thì tải lại để thấy trạng thái mới
      if (requestError.response?.status === 409) {
        getPartnerDispute(dispute._id, token).then(({ data }) => setDispute(data.dispute)).catch(() => {});
      }
    }
    setSending(false);
  };

  const startEdit = (index, currentMessage) => {
    setEditing({ index, message: currentMessage });
    setEditError("");
    setNotice("");
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing.message.trim()) { setEditError("Vui lòng nhập nội dung phản hồi."); return; }
    setSaving(true);
    try {
      const { data } = await editPartnerDisputeResponse(dispute._id, editing.index, editing.message.trim(), token);
      setDispute(data.dispute);
      setEditing(null);
      setNotice(data.message);
    } catch (requestError) {
      setEditError(requestError.response?.data?.message || "Không thể sửa phản hồi.");
      if (requestError.response?.status === 409) {
        setEditing(null);
        getPartnerDispute(dispute._id, token).then(({ data }) => setDispute(data.dispute)).catch(() => {});
      }
    }
    setSaving(false);
  };

  if (loadError) return <Alert variant="danger">{loadError} <Link to="/partner/disputes">Quay lại danh sách</Link></Alert>;
  if (!dispute) return <div className="text-center p-5"><Spinner /></div>;

  const badge = DISPUTE_STATUS[dispute.status] || { label: dispute.status, bg: "secondary" };
  const bookingStatus = BOOKING_STATUS[dispute.booking?.bookingStatus];

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1080 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Khiếu nại / {dispute.bookingCode}</div>
      <Link to={backTo} className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại</Link>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2 mb-3">
        <h1 className="h3 fw-bold mb-0">Khiếu nại · {dispute.bookingCode}</h1>
        <Badge bg={badge.bg} text={badge.text} className="fw-normal">{badge.label}</Badge>
      </div>
      {dispute.status === "WAITING_PARTNER" && <Alert variant="warning" className="small">Bộ phận vận hành đang chờ khách sạn giải trình về khiếu nại này.</Alert>}

      <div className="row g-3">
        <div className="col-lg-8">
          <Section title="Nội dung khiếu nại">
            <div className="small text-muted mb-1">{DISPUTE_CATEGORY[dispute.category] || dispute.category} · gửi lúc {formatDateTime(dispute.createdAt)}</div>
            <p className="mb-3" style={{ whiteSpace: "pre-line" }}>{dispute.description}</p>
            {dispute.attachments.length > 0 && (
              <>
                <div className="small fw-semibold mb-2">Bằng chứng khách gửi ({dispute.attachments.length})</div>
                <div className="d-flex flex-wrap gap-2">
                  {dispute.attachments.map((file, index) => (
                    <a key={`${file.fileName}-${index}`} href={file.fileUrl} download={file.fileName} target="_blank" rel="noreferrer" className="text-decoration-none small">
                      {isImage(file)
                        ? <img src={file.fileUrl} alt={file.fileName} className="rounded border" style={{ width: 120, height: 90, objectFit: "cover" }} />
                        : <span className="d-inline-flex align-items-center gap-1 border rounded px-2 py-1 text-dark"><FaPaperclip />{file.fileName}</span>}
                    </a>
                  ))}
                </div>
              </>
            )}
          </Section>

          <Section title="Trao đổi">
            {!dispute.responses.length && <p className="small text-muted">Chưa có phản hồi nào.</p>}
            {dispute.responses.map((item, index) => (
              <div key={index} className={`border-start border-3 ps-3 mb-3 ${item.from === "PARTNER" ? "border-primary" : "border-secondary"}`}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="small fw-semibold">
                    {item.from === "PARTNER" ? "Khách sạn" : "Bộ phận vận hành"}{" "}
                    <span className="text-muted fw-normal">· {formatDateTime(item.respondedAt)}{item.editedAt && ` · đã chỉnh sửa lúc ${formatDateTime(item.editedAt)}`}</span>
                  </div>
                  {item.from === "PARTNER" && dispute.canRespond && editing?.index !== index && (
                    <Button variant="link" size="sm" className="p-0 small text-decoration-none" onClick={() => startEdit(index, item.message)}><FaPen className="me-1" />Sửa</Button>
                  )}
                </div>
                {editing?.index === index ? (
                  <Form onSubmit={saveEdit} className="mt-2">
                    <Form.Control as="textarea" rows={3} autoFocus aria-label="Sửa nội dung phản hồi" maxLength={MAX_RESPONSE_LENGTH} value={editing.message}
                      onChange={(event) => { setEditing({ index, message: event.target.value }); setEditError(""); }} />
                    <div className="d-flex justify-content-between small mt-1">
                      <span className="text-danger">{editError}</span>
                      <span className="text-muted">{editing.message.length}/{MAX_RESPONSE_LENGTH}</span>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-1">
                      <Button variant="outline-secondary" size="sm" disabled={saving} onClick={() => setEditing(null)}>Hủy</Button>
                      <Button type="submit" variant="dark" size="sm" disabled={saving || editing.message.trim() === item.message}>{saving ? "Đang lưu…" : "Lưu"}</Button>
                    </div>
                  </Form>
                ) : (
                  <div className="small" style={{ whiteSpace: "pre-line" }}>{item.message}</div>
                )}
              </div>
            ))}

            {dispute.canRespond ? (
              <Form onSubmit={submit}>
                <Form.Group controlId="dispute-response">
                  <Form.Label className="small fw-semibold">Phản hồi của khách sạn</Form.Label>
                  <Form.Control as="textarea" rows={4} maxLength={MAX_RESPONSE_LENGTH} value={message}
                    onChange={(event) => { setMessage(event.target.value); setFormError(""); }}
                    placeholder="Giải trình sự việc, cung cấp thông tin để bộ phận vận hành xem xét…" />
                  <div className="d-flex justify-content-between small mt-1">
                    <span className="text-danger">{formError}</span>
                    <span className="text-muted">{message.length}/{MAX_RESPONSE_LENGTH}</span>
                  </div>
                </Form.Group>
                {notice && <Alert variant="success" className="small py-2 mt-2">{notice}</Alert>}
                <div className="d-flex justify-content-end mt-2">
                  <Button type="submit" variant="dark" size="sm" disabled={sending}>{sending ? "Đang gửi…" : "Gửi phản hồi"}</Button>
                </div>
              </Form>
            ) : (
              <p className="small text-muted mb-0">Khiếu nại đã được đóng nên không thể phản hồi thêm.</p>
            )}
          </Section>
        </div>

        <div className="col-lg-4">
          <Section title="Đặt phòng liên quan">
            <div className="small">
              <Row label="Mã đặt phòng" value={<Link to={`/partner/bookings/${dispute.bookingId}`}>{dispute.bookingCode}</Link>} />
              <Row label="Khách" value={dispute.booking?.guestName || "—"} />
              <Row label="Nhận phòng" value={formatDate(dispute.booking?.checkInDate)} />
              <Row label="Trả phòng" value={formatDate(dispute.booking?.checkOutDate)} />
              <Row label="Tổng tiền" value={formatMoney(dispute.booking?.totalAmount)} />
              {bookingStatus && <Row label="Trạng thái đơn" value={bookingStatus.label} />}
            </div>
          </Section>
          <Section title="Kết luận của bộ phận vận hành">
            {dispute.resolution ? (
              <div className="small">
                <div className="fw-semibold">{DISPUTE_OUTCOME[dispute.resolution.outcome] || dispute.resolution.outcome}</div>
                <div className="text-muted mb-2">{formatDateTime(dispute.resolution.resolvedAt)}</div>
                <div style={{ whiteSpace: "pre-line" }}>{dispute.resolution.message}</div>
              </div>
            ) : <p className="small text-muted mb-0">Chưa có kết luận.</p>}
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-3">{title}</h2>{children}</Card.Body></Card>;
const Row = ({ label, value }) => <div className="d-flex justify-content-between gap-3 py-1"><span className="text-muted">{label}</span><span className="text-end">{value}</span></div>;

export default PartnerDisputeDetail;
