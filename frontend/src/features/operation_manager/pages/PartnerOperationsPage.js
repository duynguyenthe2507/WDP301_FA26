import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { FiCheck, FiInfo, FiMessageSquare, FiRefreshCw, FiX } from 'react-icons/fi';
import { getPartnerChangeRequests, getSupportTickets, respondToSupportTicket, reviewPartnerChangeRequest } from '../managerApi';

const dateTime = (value) => new Date(value).toLocaleString('vi-VN');

const PartnerOperationsPage = () => {
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [requestResponse, ticketResponse] = await Promise.all([getPartnerChangeRequests({ limit: 20 }), getSupportTickets({ limit: 20 })]);
      setRequests(requestResponse.data.requests || []); setTickets(ticketResponse.data.tickets || []);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải dữ liệu đối tác.'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reviewChange = async (request, decision) => {
    const note = decision === 'APPROVE' ? '' : window.prompt('Nhập ghi chú xử lý:');
    if (decision !== 'APPROVE' && !note?.trim()) return;
    setBusyId(request._id);
    try { await reviewPartnerChangeRequest(request._id, { decision, note }); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể xử lý yêu cầu thay đổi.'); } finally { setBusyId(''); }
  };

  const respondTicket = async (ticket, status, escalate = false) => {
    const message = window.prompt(escalate ? 'Nêu lý do chuyển cấp:' : 'Nhập phản hồi cho đối tác:');
    if (!message?.trim()) return;
    setBusyId(ticket._id);
    try { await respondToSupportTicket(ticket._id, { message, status, escalate }); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể phản hồi ticket.'); } finally { setBusyId(''); }
  };

  return <div>
    <div className="om-page-heading"><div><h2>Yêu cầu đối tác</h2><p>Kiểm soát thay đổi thông tin nhạy cảm và phản hồi hỗ trợ trong thời hạn SLA 24 giờ.</p></div><Button className="om-action" variant="outline-primary" onClick={load} disabled={loading}><FiRefreshCw /> Làm mới</Button></div>
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    {loading ? <div className="om-empty"><Spinner /></div> : <>
      <Card className="om-card mb-4"><div className="om-section-header"><div><h3 className="om-card-title">Thay đổi hồ sơ khách sạn</h3><p className="text-muted small mb-0 mt-1">Chỉ phê duyệt sau khi đã kiểm tra tài liệu và thông tin pháp lý.</p></div></div>
        <Table responsive hover className="om-table align-middle"><thead><tr><th>Khách sạn / đối tác</th><th>Nội dung thay đổi</th><th>Trạng thái</th><th>Ngày gửi</th><th className="text-end">Thao tác</th></tr></thead><tbody>{requests.length ? requests.map((request) => <tr key={request._id}><td><span className="om-primary-text">{request.hotelId?.name || 'Khách sạn'}</span><span className="om-secondary-text">{request.partnerId?.fullName || 'Đối tác'}</span></td><td>{request.changes.map((change) => change.field).join(', ')}</td><td><span className={`om-status ${request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : request.status === 'ADDITIONAL_INFO_REQUIRED' ? 'neutral' : 'pending'}`}>{request.status}</span></td><td>{dateTime(request.createdAt)}</td><td className="text-end"><div className="om-actions">{['PENDING', 'ADDITIONAL_INFO_REQUIRED'].includes(request.status) && <><Button className="om-action" size="sm" variant="success" disabled={busyId === request._id} onClick={() => reviewChange(request, 'APPROVE')}><FiCheck /> Duyệt</Button><Button className="om-action" size="sm" variant="outline-primary" disabled={busyId === request._id} onClick={() => reviewChange(request, 'REQUEST_INFO')}><FiInfo /> Bổ sung</Button><Button className="om-action" size="sm" variant="outline-danger" disabled={busyId === request._id} onClick={() => reviewChange(request, 'REJECT')}><FiX /> Từ chối</Button></>}</div></td></tr>) : <tr><td colSpan="5" className="om-empty">Chưa có yêu cầu thay đổi.</td></tr>}</tbody></Table>
      </Card>
      <Card className="om-card"><div className="om-section-header"><div><h3 className="om-card-title">Ticket hỗ trợ đối tác</h3><p className="text-muted small mb-0 mt-1">Các ticket chưa có phản hồi sau 24 giờ được đánh dấu quá hạn.</p></div></div>
        <Table responsive hover className="om-table align-middle"><thead><tr><th>Ticket</th><th>Đối tác</th><th>Trạng thái</th><th>SLA</th><th className="text-end">Thao tác</th></tr></thead><tbody>{tickets.length ? tickets.map((ticket) => <tr key={ticket._id}><td><span className="om-primary-text">{ticket.subject}</span><span className="om-secondary-text">{ticket.hotelId?.name || 'Không gắn khách sạn'} · {ticket.category}</span></td><td>{ticket.partnerId?.fullName || 'Đối tác'}</td><td><span className={`om-status ${ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'ESCALATED' ? 'danger' : 'progress'}`}>{ticket.status}</span></td><td>{ticket.isOverdue ? <span className="text-danger">Quá hạn 24h</span> : 'Đúng hạn'}</td><td className="text-end"><div className="om-actions">{ticket.status !== 'RESOLVED' && <><Button className="om-action" size="sm" variant="primary" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'IN_PROGRESS')}><FiMessageSquare /> Phản hồi</Button><Button className="om-action" size="sm" variant="success" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'RESOLVED')}>Hoàn tất</Button><Button className="om-action" size="sm" variant="outline-danger" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'IN_PROGRESS', true)}>Chuyển cấp</Button></>}</div></td></tr>) : <tr><td colSpan="5" className="om-empty">Chưa có ticket hỗ trợ.</td></tr>}</tbody></Table>
      </Card>
    </>}
  </div>;
};

export default PartnerOperationsPage;

