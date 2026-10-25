import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Spinner, Table } from 'react-bootstrap';
import { getManagerAuditLogs } from '../managerApi';

const labels = { HOTEL_VERIFICATION_APPROVED: 'Duyá»‡t há»“ sÆ¡ khÃ¡ch sáº¡n', HOTEL_VERIFICATION_REJECTED: 'Tá»« chá»‘i há»“ sÆ¡ khÃ¡ch sáº¡n', HOTEL_VERIFICATION_INFO_REQUESTED: 'YÃªu cáº§u bá»• sung há»“ sÆ¡', DISPUTE_IN_PROGRESS: 'Nháº­n xá»­ lÃ½ tranh cháº¥p', DISPUTE_RESOLVED: 'Giáº£i quyáº¿t tranh cháº¥p', DISPUTE_REJECTED: 'Tá»« chá»‘i tranh cháº¥p', REFUND_APPROVED: 'Duyá»‡t hoÃ n tiá»n', REFUND_REJECTED: 'Tá»« chá»‘i hoÃ n tiá»n', REFUND_PROCESSED: 'XÃ¡c nháº­n Ä‘Ã£ hoÃ n tiá»n', PAYOUT_GENERATED: 'Láº­p báº£ng kÃª chi tráº£', PAYOUT_APPROVED: 'Duyá»‡t chi tráº£', PAYOUT_REJECTED: 'Tá»« chá»‘i chi tráº£', PAYOUT_PAID: 'XÃ¡c nháº­n Ä‘Ã£ chi tráº£', COMMISSION_POLICY_CREATED: 'Táº¡o chÃ­nh sÃ¡ch hoa há»“ng', COMMISSION_POLICY_UPDATED: 'Cáº­p nháº­t chÃ­nh sÃ¡ch hoa há»“ng' };
const entityLabels = { HOTEL_VERIFICATION: 'Há»“ sÆ¡ khÃ¡ch sáº¡n', DISPUTE: 'Tranh cháº¥p', REFUND_REQUEST: 'YÃªu cáº§u hoÃ n tiá»n', PAYOUT: 'Báº£ng kÃª chi tráº£', COMMISSION_POLICY: 'ChÃ­nh sÃ¡ch hoa há»“ng' };
const ManagerAuditLogPage = () => {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setLogs((await getManagerAuditLogs()).data.logs || []); } catch (requestError) { setError(requestError.response?.data?.message || 'KhÃ´ng thá»ƒ táº£i lá»‹ch sá»­ thao tÃ¡c.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return <div><div className="om-page-heading"><div><h2>Lá»‹ch sá»­ thao tÃ¡c</h2><p>Theo dÃµi toÃ n bá»™ quyáº¿t Ä‘á»‹nh váº­n hÃ nh do báº¡n thá»±c hiá»‡n.</p></div></div>{error && <Alert variant="danger">{error}</Alert>}<Card className="om-card"><div className="om-section-header"><div><h3 className="om-card-title">Nháº­t kÃ½ váº­n hÃ nh</h3><p className="text-muted small mb-0 mt-1">Má»i thay Ä‘á»•i quan trá»ng Ä‘á»u Ä‘Æ°á»£c lÆ°u láº¡i.</p></div></div><Card.Body className="p-0">{loading ? <div className="om-empty"><Spinner /></div> : <Table responsive hover className="om-table mb-0"><thead><tr><th>Thao tÃ¡c</th><th>Äá»‘i tÆ°á»£ng</th><th>Thá»i gian</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log._id}><td className="om-primary-text">{labels[log.action] || log.action}</td><td>{entityLabels[log.entityType] || log.entityType || 'KhÃ´ng xÃ¡c Ä‘á»‹nh'}</td><td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td></tr>) : <tr><td colSpan="3" className="om-empty">ChÆ°a cÃ³ lá»‹ch sá»­ thao tÃ¡c.</td></tr>}</tbody></Table>}</Card.Body></Card></div>;
};
export default ManagerAuditLogPage;

