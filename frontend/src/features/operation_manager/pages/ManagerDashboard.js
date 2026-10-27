import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import { FiAlertCircle, FiCheckSquare, FiCreditCard, FiShield } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getManagerDashboard } from '../managerApi';

const actionLabels = {
  HOTEL_VERIFICATION_APPROVED: 'Đã duyệt hồ sơ khách sạn', HOTEL_VERIFICATION_REJECTED: 'Đã từ chối hồ sơ khách sạn',
  DISPUTE_RESOLVED: 'Đã giải quyết tranh chấp', DISPUTE_REJECTED: 'Đã từ chối tranh chấp',
  REFUND_APPROVED: 'Đã duyệt hoàn tiền', REFUND_PROCESSED: 'Đã xác nhận hoàn tiền',
  PAYOUT_APPROVED: 'Đã duyệt chi trả', PAYOUT_PAID: 'Đã xác nhận chi trả',
};

const ManagerDashboard = () => {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData((await getManagerDashboard()).data); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải dữ liệu tổng quan.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const queues = useMemo(() => [
    { label: 'Xác minh', value: data?.stats.verificationPending || 0, detail: 'Hồ sơ khách sạn', icon: FiShield, tone: 'om-blue', color: '#246bfe', to: '/manager/verifications' },
    { label: 'Tranh chấp', value: data?.stats.disputeOpen || 0, detail: 'Yêu cầu khách hàng', icon: FiAlertCircle, tone: 'om-amber', color: '#e89b22', to: '/manager/disputes' },
    { label: 'Hoàn tiền', value: data?.stats.refundPending || 0, detail: 'Yêu cầu cần quyết định', icon: FiCreditCard, tone: 'om-red', color: '#df5a5a', to: '/manager/refunds' },
    { label: 'Chi trả', value: data?.stats.payoutPending || 0, detail: 'Bảng kê đối tác', icon: FiCheckSquare, tone: 'om-green', color: '#0f9d78', to: '/manager/payouts' },
  ], [data]);
  const total = queues.reduce((sum, queue) => sum + queue.value, 0);
  const max = Math.max(...queues.map((queue) => queue.value), 1);
  const linePoints = queues.map((queue, index) => `${80 + index * 170},${168 - (queue.value / max) * 102}`).join(' ');
  const donut = queues.reduce((segments, queue) => {
    const previous = segments[segments.length - 1]; const start = previous ? previous.offset + previous.length : 0;
    const length = total ? (queue.value / total) * 339.3 : 0;
    segments.push({ ...queue, length, offset: start }); return segments;
  }, []);
  return <div><div className="om-page-heading"><div><h2>Điều hành nền tảng hiệu quả</h2><p>Theo dõi và xử lý các công việc vận hành cần ưu tiên hôm nay.</p></div><div className="om-live-indicator"><span />Dữ liệu hàng đợi hiện tại</div></div>{error && <Alert variant="danger">{error}</Alert>}
    <Row className="g-3 mb-4">{queues.map((queue) => { const Icon = queue.icon; return <Col sm={6} xl={3} key={queue.label}><Link to={queue.to} className="text-decoration-none"><article className="om-kpi"><div><div className="om-kpi-label">{queue.label}</div><div className="om-kpi-value">{data ? queue.value : <Spinner size="sm" />}</div><div className="om-kpi-detail">{queue.detail}</div></div><span className={`om-kpi-icon ${queue.tone}`}><Icon /></span></article></Link></Col>; })}</Row>
    <Row className="g-4 mb-4"><Col xl={8}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Dòng công việc hiện tại</h3><p className="text-muted small mb-0 mt-1">Số lượng yêu cầu đang chờ xử lý theo từng nhóm nghiệp vụ.</p></div><span className="om-chart-total">{total} việc cần xử lý</span></div><Card.Body className="pt-0"><div className="om-line-chart">{data ? <svg viewBox="0 0 620 230" role="img" aria-label="Biểu đồ số lượng yêu cầu theo hàng đợi"><defs><linearGradient id="queueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#246bfe" stopOpacity=".22" /><stop offset="100%" stopColor="#246bfe" stopOpacity="0" /></linearGradient></defs><line x1="55" y1="35" x2="590" y2="35" className="om-chart-grid" /><line x1="55" y1="100" x2="590" y2="100" className="om-chart-grid" /><line x1="55" y1="168" x2="590" y2="168" className="om-chart-grid" /><path d={`M 80,168 L ${linePoints} L 590,168 Z`} fill="url(#queueFill)" /><polyline points={linePoints} className="om-chart-line" />{queues.map((queue, index) => { const x = 80 + index * 170; const y = 168 - (queue.value / max) * 102; return <g key={queue.label}><circle cx={x} cy={y} r="6" fill="#fff" stroke={queue.color} strokeWidth="4" /><text x={x} y={y - 14} textAnchor="middle" className="om-chart-value">{queue.value}</text><text x={x} y="202" textAnchor="middle" className="om-chart-label">{queue.label}</text></g>; })}</svg> : <div className="om-chart-loading"><Spinner /></div>}</div></Card.Body></Card></Col>
      <Col xl={4}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Tỷ trọng hàng đợi</h3><p className="text-muted small mb-0 mt-1">Phân bổ công việc theo nghiệp vụ.</p></div></div><Card.Body className="pt-0">{data ? <div className="om-donut-wrap"><svg viewBox="0 0 170 170" className="om-donut" role="img" aria-label="Biểu đồ tròn tỷ trọng các hàng đợi"><circle cx="85" cy="85" r="54" className="om-donut-base" />{donut.map((segment) => <circle key={segment.label} cx="85" cy="85" r="54" fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${segment.length} ${339.3 - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 85 85)" />)}<text x="85" y="80" textAnchor="middle" className="om-donut-number">{total}</text><text x="85" y="99" textAnchor="middle" className="om-donut-caption">CẦN XỬ LÝ</text></svg><div className="om-chart-legend">{queues.map((queue) => <div key={queue.label}><span style={{ background: queue.color }} />{queue.label}<strong>{total ? Math.round((queue.value / total) * 100) : 0}%</strong></div>)}</div></div> : <div className="om-chart-loading"><Spinner /></div>}</Card.Body></Card></Col></Row>
    <Row className="g-4"><Col xl={7}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Mức độ ưu tiên</h3><p className="text-muted small mb-0 mt-1">So sánh khối lượng cần xử lý giữa các hàng đợi.</p></div></div><Card.Body className="pt-0"><div className="om-bar-list">{queues.map((queue) => <Link key={queue.label} to={queue.to} className="om-bar-row"><div><span>{queue.label}</span><strong>{queue.value}</strong></div><div className="om-bar-track"><span style={{ width: `${(queue.value / max) * 100}%`, background: queue.color }} /></div></Link>)}</div></Card.Body></Card></Col><Col xl={5}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Hoạt động gần đây</h3><p className="text-muted small mb-0 mt-1">Các thao tác do bạn thực hiện.</p></div><Link to="/manager/audit-history" className="small text-decoration-none">Xem tất cả</Link></div><Card.Body className="pt-0">{data?.recentActivity?.length ? data.recentActivity.map((log) => <div className="om-activity" key={log._id}><span className="om-activity-dot" /><div><div className="om-activity-title">{actionLabels[log.action] || log.action}</div><span className="om-activity-time">{new Date(log.createdAt).toLocaleString('vi-VN')}</span></div></div>) : <div className="text-muted small py-4">Chưa có thao tác nào được ghi nhận.</div>}</Card.Body></Card></Col></Row>
  </div>;
};

export default ManagerDashboard;

