import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner, Table } from "react-bootstrap";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import TablePagination from "../components/TablePagination";
import ValidReportWarning from "../components/ValidReportWarning";
import { formatDate, formatDateTime } from "../data/bookingOptions";
import { DISPUTE_CATEGORY, DISPUTE_STATUS } from "../data/disputeOptions";
import { getPartnerDisputes } from "../partnerApi";

const NO_DISPUTES = "Chưa có khiếu nại nào.";

const PartnerDisputes = () => {
  const { token } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const status = searchParams.get("status") || "";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getPartnerDisputes({ status, page: searchParams.get("page") || 1 }, token)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải danh sách khiếu nại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams, status, token, retryCount]);

  const setParam = (key, value) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    return next;
  });
  const openDispute = (dispute) => navigate(`/partner/disputes/${dispute._id}`, { state: { from: location.pathname + location.search } });

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Khiếu nại</div>
      <h1 className="h3 fw-bold mb-1">Khiếu nại của khách</h1>
      <p className="text-muted mb-4">Bộ phận vận hành xử lý và kết luận khiếu nại. Khách sạn xem nội dung và gửi phản hồi để giải trình.</p>

      {result && <ValidReportWarning count={result.validReportCount} limit={result.validReportLimit} />}

      {result?.waitingCount > 0 && (
        <Alert variant="warning" className="d-flex justify-content-between align-items-center">
          <span>Có {result.waitingCount} khiếu nại đang chờ khách sạn phản hồi.</span>
          <Button size="sm" variant="outline-dark" onClick={() => setParam("status", "WAITING_PARTNER")}>Xem ngay</Button>
        </Alert>
      )}

      <Card className="border-0 shadow-sm rounded-4 mb-3">
        <Card.Body className="p-3 d-flex flex-wrap gap-2 align-items-center">
          <Form.Label htmlFor="dispute-status" className="small fw-semibold mb-0">Trạng thái</Form.Label>
          <Form.Select id="dispute-status" size="sm" className="w-auto" value={status} onChange={(event) => setParam("status", event.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(DISPUTE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </Form.Select>
        </Card.Body>
      </Card>

      {loadError && <Alert variant="danger" className="d-flex justify-content-between align-items-center">{loadError}<Button size="sm" variant="outline-danger" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</Button></Alert>}
      {loading && !result && <div className="text-center p-5"><Spinner /></div>}
      {result && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden" style={{ opacity: loading ? 0.6 : 1 }}>
          <Table responsive hover className="align-middle mb-0 small">
            <thead className="table-light"><tr><th>Mã đặt phòng</th><th>Khách</th><th>Lưu trú</th><th>Loại khiếu nại</th><th>Gửi lúc</th><th>Phản hồi của khách sạn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {result.disputes.map((dispute) => {
                const badge = DISPUTE_STATUS[dispute.status] || { label: dispute.status, bg: "secondary" };
                return (
                  <tr key={dispute._id} role="button" onClick={() => openDispute(dispute)}>
                    <td className="text-nowrap fw-semibold">{dispute.bookingCode}</td>
                    <td>{dispute.guestName}</td>
                    <td className="text-nowrap">{formatDate(dispute.checkInDate)}<br /><span className="text-muted">{formatDate(dispute.checkOutDate)}</span></td>
                    <td>{DISPUTE_CATEGORY[dispute.category] || dispute.category}</td>
                    <td className="text-nowrap">{formatDateTime(dispute.createdAt)}</td>
                    <td className="text-nowrap">{dispute.responseCount ? `${dispute.responseCount} phản hồi · ${formatDateTime(dispute.lastRespondedAt)}` : <span className="text-muted">Chưa phản hồi</span>}</td>
                    <td><Badge bg={badge.bg} text={badge.text} className="fw-normal">{badge.label}</Badge></td>
                  </tr>
                );
              })}
              {!result.disputes.length && <tr><td colSpan="7" className="text-center text-muted py-5">{NO_DISPUTES}</td></tr>}
            </tbody>
          </Table>
          {result.pagination.totalPages > 1 && <Card.Footer className="bg-white"><TablePagination pagination={result.pagination} onChange={(page) => setParam("page", String(page))} /></Card.Footer>}
        </Card>
      )}
    </div>
  );
};

export default PartnerDisputes;
