import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Spinner } from 'react-bootstrap';
import { FiAlertCircle, FiCheckSquare, FiCreditCard, FiShield } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getManagerDashboard } from '../managerApi';

const actionLabels = {
  HOTEL_VERIFICATION_APPROVED: 'ÄÃ£ duyá»‡t há»“ sÆ¡ khÃ¡ch sáº¡n', HOTEL_VERIFICATION_REJECTED: 'ÄÃ£ tá»« chá»‘i há»“ sÆ¡ khÃ¡ch sáº¡n',
  DISPUTE_RESOLVED: 'ÄÃ£ giáº£i quyáº¿t tranh cháº¥p', DISPUTE_REJECTED: 'ÄÃ£ tá»« chá»‘i tranh cháº¥p',
  REFUND_APPROVED: 'ÄÃ£ duyá»‡t hoÃ n tiá»n', REFUND_PROCESSED: 'ÄÃ£ xÃ¡c nháº­n hoÃ n tiá»n',
  PAYOUT_APPROVED: 'ÄÃ£ duyá»‡t chi tráº£', PAYOUT_PAID: 'ÄÃ£ xÃ¡c nháº­n chi tráº£',
};

const ManagerDashboard = () => {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData((await getManagerDashboard()).data); } catch (requestError) { setError(requestError.response?.data?.message || 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u tá»•ng quan.'); } }, []);
  useEffect(() => { load(); }, [load]);
  const queues = useMemo(() => [
    { label: 'XÃ¡c minh', value: data?.stats.verificationPending || 0, detail: 'Há»“ sÆ¡ khÃ¡ch sáº¡n', icon: FiShield, tone: 'om-blue', color: '#246bfe', to: '/manager/verifications' },
    { label: 'Tranh cháº¥p', value: data?.stats.disputeOpen || 0, detail: 'YÃªu cáº§u khÃ¡ch hÃ ng', icon: FiAlertCircle, tone: 'om-amber', color: '#e89b22', to: '/manager/disputes' },
    { label: 'HoÃ n tiá»n', value: data?.stats.refundPending || 0, detail: 'YÃªu cáº§u cáº§n quyáº¿t Ä‘á»‹nh', icon: FiCreditCard, tone: 'om-red', color: '#df5a5a', to: '/manager/refunds' },
    { label: 'Chi tráº£', value: data?.stats.payoutPending || 0, detail: 'Báº£ng kÃª Ä‘á»‘i tÃ¡c', icon: FiCheckSquare, tone: 'om-green', color: '#0f9d78', to: '/manager/payouts' },
  ], [data]);
  const total = queues.reduce((sum, queue) => sum + queue.value, 0);
  const max = Math.max(...queues.map((queue) => queue.value), 1);
  const linePoints = queues.map((queue, index) => `${80 + index * 170},${168 - (queue.value / max) * 102}`).join(' ');
  const donut = queues.reduce((segments, queue) => {
    const previous = segments[segments.length - 1]; const start = previous ? previous.offset + previous.length : 0;
    const length = total ? (queue.value / total) * 339.3 : 0;
    segments.push({ ...queue, length, offset: start }); return segments;
  }, []);
  return <div><div className="om-page-heading"><div><h2>Äiá»u hÃ nh ná»n táº£ng hiá»‡u quáº£</h2><p>Theo dÃµi vÃ  xá»­ lÃ½ cÃ¡c cÃ´ng viá»‡c váº­n hÃ nh cáº§n Æ°u tiÃªn hÃ´m nay.</p></div><div className="om-live-indicator"><span />Dá»¯ liá»‡u hÃ ng Ä‘á»£i hiá»‡n táº¡i</div></div>{error && <Alert variant="danger">{error}</Alert>}
    <Row className="g-3 mb-4">{queues.map((queue) => { const Icon = queue.icon; return <Col sm={6} xl={3} key={queue.label}><Link to={queue.to} className="text-decoration-none"><article className="om-kpi"><div><div className="om-kpi-label">{queue.label}</div><div className="om-kpi-value">{data ? queue.value : <Spinner size="sm" />}</div><div className="om-kpi-detail">{queue.detail}</div></div><span className={`om-kpi-icon ${queue.tone}`}><Icon /></span></article></Link></Col>; })}</Row>
    <Row className="g-4 mb-4"><Col xl={8}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">DÃ²ng cÃ´ng viá»‡c hiá»‡n táº¡i</h3><p className="text-muted small mb-0 mt-1">Sá»‘ lÆ°á»£ng yÃªu cáº§u Ä‘ang chá» xá»­ lÃ½ theo tá»«ng nhÃ³m nghiá»‡p vá»¥.</p></div><span className="om-chart-total">{total} viá»‡c cáº§n xá»­ lÃ½</span></div><Card.Body className="pt-0"><div className="om-line-chart">{data ? <svg viewBox="0 0 620 230" role="img" aria-label="Biá»ƒu Ä‘á»“ sá»‘ lÆ°á»£ng yÃªu cáº§u theo hÃ ng Ä‘á»£i"><defs><linearGradient id="queueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#246bfe" stopOpacity=".22" /><stop offset="100%" stopColor="#246bfe" stopOpacity="0" /></linearGradient></defs><line x1="55" y1="35" x2="590" y2="35" className="om-chart-grid" /><line x1="55" y1="100" x2="590" y2="100" className="om-chart-grid" /><line x1="55" y1="168" x2="590" y2="168" className="om-chart-grid" /><path d={`M 80,168 L ${linePoints} L 590,168 Z`} fill="url(#queueFill)" /><polyline points={linePoints} className="om-chart-line" />{queues.map((queue, index) => { const x = 80 + index * 170; const y = 168 - (queue.value / max) * 102; return <g key={queue.label}><circle cx={x} cy={y} r="6" fill="#fff" stroke={queue.color} strokeWidth="4" /><text x={x} y={y - 14} textAnchor="middle" className="om-chart-value">{queue.value}</text><text x={x} y="202" textAnchor="middle" className="om-chart-label">{queue.label}</text></g>; })}</svg> : <div className="om-chart-loading"><Spinner /></div>}</div></Card.Body></Card></Col>
      <Col xl={4}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Tá»· trá»ng hÃ ng Ä‘á»£i</h3><p className="text-muted small mb-0 mt-1">PhÃ¢n bá»• cÃ´ng viá»‡c theo nghiá»‡p vá»¥.</p></div></div><Card.Body className="pt-0">{data ? <div className="om-donut-wrap"><svg viewBox="0 0 170 170" className="om-donut" role="img" aria-label="Biá»ƒu Ä‘á»“ trÃ²n tá»· trá»ng cÃ¡c hÃ ng Ä‘á»£i"><circle cx="85" cy="85" r="54" className="om-donut-base" />{donut.map((segment) => <circle key={segment.label} cx="85" cy="85" r="54" fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${segment.length} ${339.3 - segment.length}`} strokeDashoffset={-segment.offset} transform="rotate(-90 85 85)" />)}<text x="85" y="80" textAnchor="middle" className="om-donut-number">{total}</text><text x="85" y="99" textAnchor="middle" className="om-donut-caption">Cáº¦N Xá»¬ LÃ</text></svg><div className="om-chart-legend">{queues.map((queue) => <div key={queue.label}><span style={{ background: queue.color }} />{queue.label}<strong>{total ? Math.round((queue.value / total) * 100) : 0}%</strong></div>)}</div></div> : <div className="om-chart-loading"><Spinner /></div>}</Card.Body></Card></Col></Row>
    <Row className="g-4"><Col xl={7}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Má»©c Ä‘á»™ Æ°u tiÃªn</h3><p className="text-muted small mb-0 mt-1">So sÃ¡nh khá»‘i lÆ°á»£ng cáº§n xá»­ lÃ½ giá»¯a cÃ¡c hÃ ng Ä‘á»£i.</p></div></div><Card.Body className="pt-0"><div className="om-bar-list">{queues.map((queue) => <Link key={queue.label} to={queue.to} className="om-bar-row"><div><span>{queue.label}</span><strong>{queue.value}</strong></div><div className="om-bar-track"><span style={{ width: `${(queue.value / max) * 100}%`, background: queue.color }} /></div></Link>)}</div></Card.Body></Card></Col><Col xl={5}><Card className="om-card h-100"><div className="om-section-header"><div><h3 className="om-card-title">Hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y</h3><p className="text-muted small mb-0 mt-1">CÃ¡c thao tÃ¡c do báº¡n thá»±c hiá»‡n.</p></div><Link to="/manager/audit-history" className="small text-decoration-none">Xem táº¥t cáº£</Link></div><Card.Body className="pt-0">{data?.recentActivity?.length ? data.recentActivity.map((log) => <div className="om-activity" key={log._id}><span className="om-activity-dot" /><div><div className="om-activity-title">{actionLabels[log.action] || log.action}</div><span className="om-activity-time">{new Date(log.createdAt).toLocaleString('vi-VN')}</span></div></div>) : <div className="text-muted small py-4">ChÆ°a cÃ³ thao tÃ¡c nÃ o Ä‘Æ°á»£c ghi nháº­n.</div>}</Card.Body></Card></Col></Row>
  </div>;
};

export default ManagerDashboard;

