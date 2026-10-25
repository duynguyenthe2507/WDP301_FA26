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
    } catch (requestError) { setError(requestError.response?.data?.message || 'KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u Ä‘á»‘i tÃ¡c.'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reviewChange = async (request, decision) => {
    const note = decision === 'APPROVE' ? '' : window.prompt('Nháº­p ghi chÃº xá»­ lÃ½:');
    if (decision !== 'APPROVE' && !note?.trim()) return;
    setBusyId(request._id);
    try { await reviewPartnerChangeRequest(request._id, { decision, note }); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'KhÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u thay Ä‘á»•i.'); } finally { setBusyId(''); }
  };

  const respondTicket = async (ticket, status, escalate = false) => {
    const message = window.prompt(escalate ? 'NÃªu lÃ½ do chuyá»ƒn cáº¥p:' : 'Nháº­p pháº£n há»“i cho Ä‘á»‘i tÃ¡c:');
    if (!message?.trim()) return;
    setBusyId(ticket._id);
    try { await respondToSupportTicket(ticket._id, { message, status, escalate }); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'KhÃ´ng thá»ƒ pháº£n há»“i ticket.'); } finally { setBusyId(''); }
  };

  return <div>
    <div className="om-page-heading"><div><h2>YÃªu cáº§u Ä‘á»‘i tÃ¡c</h2><p>Kiá»ƒm soÃ¡t thay Ä‘á»•i thÃ´ng tin nháº¡y cáº£m vÃ  pháº£n há»“i há»— trá»£ trong thá»i háº¡n SLA 24 giá».</p></div><Button className="om-action" variant="outline-primary" onClick={load} disabled={loading}><FiRefreshCw /> LÃ m má»›i</Button></div>
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    {loading ? <div className="om-empty"><Spinner /></div> : <>
      <Card className="om-card mb-4"><div className="om-section-header"><div><h3 className="om-card-title">Thay Ä‘á»•i há»“ sÆ¡ khÃ¡ch sáº¡n</h3><p className="text-muted small mb-0 mt-1">Chá»‰ phÃª duyá»‡t sau khi Ä‘Ã£ kiá»ƒm tra tÃ i liá»‡u vÃ  thÃ´ng tin phÃ¡p lÃ½.</p></div></div>
        <Table responsive hover className="om-table align-middle"><thead><tr><th>KhÃ¡ch sáº¡n / Ä‘á»‘i tÃ¡c</th><th>Ná»™i dung thay Ä‘á»•i</th><th>Tráº¡ng thÃ¡i</th><th>NgÃ y gá»­i</th><th className="text-end">Thao tÃ¡c</th></tr></thead><tbody>{requests.length ? requests.map((request) => <tr key={request._id}><td><span className="om-primary-text">{request.hotelId?.name || 'KhÃ¡ch sáº¡n'}</span><span className="om-secondary-text">{request.partnerId?.fullName || 'Äá»‘i tÃ¡c'}</span></td><td>{request.changes.map((change) => change.field).join(', ')}</td><td><span className={`om-status ${request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : request.status === 'ADDITIONAL_INFO_REQUIRED' ? 'neutral' : 'pending'}`}>{request.status}</span></td><td>{dateTime(request.createdAt)}</td><td className="text-end"><div className="om-actions">{['PENDING', 'ADDITIONAL_INFO_REQUIRED'].includes(request.status) && <><Button className="om-action" size="sm" variant="success" disabled={busyId === request._id} onClick={() => reviewChange(request, 'APPROVE')}><FiCheck /> Duyá»‡t</Button><Button className="om-action" size="sm" variant="outline-primary" disabled={busyId === request._id} onClick={() => reviewChange(request, 'REQUEST_INFO')}><FiInfo /> Bá»• sung</Button><Button className="om-action" size="sm" variant="outline-danger" disabled={busyId === request._id} onClick={() => reviewChange(request, 'REJECT')}><FiX /> Tá»« chá»‘i</Button></>}</div></td></tr>) : <tr><td colSpan="5" className="om-empty">ChÆ°a cÃ³ yÃªu cáº§u thay Ä‘á»•i.</td></tr>}</tbody></Table>
      </Card>
      <Card className="om-card"><div className="om-section-header"><div><h3 className="om-card-title">Ticket há»— trá»£ Ä‘á»‘i tÃ¡c</h3><p className="text-muted small mb-0 mt-1">CÃ¡c ticket chÆ°a cÃ³ pháº£n há»“i sau 24 giá» Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u quÃ¡ háº¡n.</p></div></div>
        <Table responsive hover className="om-table align-middle"><thead><tr><th>Ticket</th><th>Äá»‘i tÃ¡c</th><th>Tráº¡ng thÃ¡i</th><th>SLA</th><th className="text-end">Thao tÃ¡c</th></tr></thead><tbody>{tickets.length ? tickets.map((ticket) => <tr key={ticket._id}><td><span className="om-primary-text">{ticket.subject}</span><span className="om-secondary-text">{ticket.hotelId?.name || 'KhÃ´ng gáº¯n khÃ¡ch sáº¡n'} Â· {ticket.category}</span></td><td>{ticket.partnerId?.fullName || 'Äá»‘i tÃ¡c'}</td><td><span className={`om-status ${ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'ESCALATED' ? 'danger' : 'progress'}`}>{ticket.status}</span></td><td>{ticket.isOverdue ? <span className="text-danger">QuÃ¡ háº¡n 24h</span> : 'ÄÃºng háº¡n'}</td><td className="text-end"><div className="om-actions">{ticket.status !== 'RESOLVED' && <><Button className="om-action" size="sm" variant="primary" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'IN_PROGRESS')}><FiMessageSquare /> Pháº£n há»“i</Button><Button className="om-action" size="sm" variant="success" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'RESOLVED')}>HoÃ n táº¥t</Button><Button className="om-action" size="sm" variant="outline-danger" disabled={busyId === ticket._id} onClick={() => respondTicket(ticket, 'IN_PROGRESS', true)}>Chuyá»ƒn cáº¥p</Button></>}</div></td></tr>) : <tr><td colSpan="5" className="om-empty">ChÆ°a cÃ³ ticket há»— trá»£.</td></tr>}</tbody></Table>
      </Card>
    </>}
  </div>;
};

export default PartnerOperationsPage;

