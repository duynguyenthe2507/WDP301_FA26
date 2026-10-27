import { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Spinner, Table } from 'react-bootstrap';
import { getManagerAuditLogs } from '../managerApi';

const labels = { HOTEL_VERIFICATION_APPROVED: 'Duyệt hồ sơ khách sạn', HOTEL_VERIFICATION_REJECTED: 'Từ chối hồ sơ khách sạn', HOTEL_VERIFICATION_INFO_REQUESTED: 'Yêu cầu bổ sung hồ sơ', DISPUTE_IN_PROGRESS: 'Nhận xử lý tranh chấp', DISPUTE_RESOLVED: 'Giải quyết tranh chấp', DISPUTE_REJECTED: 'Từ chối tranh chấp', REFUND_APPROVED: 'Duyệt hoàn tiền', REFUND_REJECTED: 'Từ chối hoàn tiền', REFUND_PROCESSED: 'Xác nhận đã hoàn tiền', PAYOUT_GENERATED: 'Lập bảng kê chi trả', PAYOUT_APPROVED: 'Duyệt chi trả', PAYOUT_REJECTED: 'Từ chối chi trả', PAYOUT_PAID: 'Xác nhận đã chi trả', COMMISSION_POLICY_CREATED: 'Tạo chính sách hoa hồng', COMMISSION_POLICY_UPDATED: 'Cập nhật chính sách hoa hồng' };
const entityLabels = { HOTEL_VERIFICATION: 'Hồ sơ khách sạn', DISPUTE: 'Tranh chấp', REFUND_REQUEST: 'Yêu cầu hoàn tiền', PAYOUT: 'Bảng kê chi trả', COMMISSION_POLICY: 'Chính sách hoa hồng' };
const ManagerAuditLogPage = () => {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setLogs((await getManagerAuditLogs()).data.logs || []); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải lịch sử thao tác.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return <div><div className="om-page-heading"><div><h2>Lịch sử thao tác</h2><p>Theo dõi toàn bộ quyết định vận hành do bạn thực hiện.</p></div></div>{error && <Alert variant="danger">{error}</Alert>}<Card className="om-card"><div className="om-section-header"><div><h3 className="om-card-title">Nhật ký vận hành</h3><p className="text-muted small mb-0 mt-1">Mọi thay đổi quan trọng đều được lưu lại.</p></div></div><Card.Body className="p-0">{loading ? <div className="om-empty"><Spinner /></div> : <Table responsive hover className="om-table mb-0"><thead><tr><th>Thao tác</th><th>Đối tượng</th><th>Thời gian</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log._id}><td className="om-primary-text">{labels[log.action] || log.action}</td><td>{entityLabels[log.entityType] || log.entityType || 'Không xác định'}</td><td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td></tr>) : <tr><td colSpan="3" className="om-empty">Chưa có lịch sử thao tác.</td></tr>}</tbody></Table>}</Card.Body></Card></div>;
};
export default ManagerAuditLogPage;

