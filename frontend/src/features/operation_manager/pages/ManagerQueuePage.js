import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Modal, Spinner, Table } from "react-bootstrap";
import {
  getDisputes,
  getRefunds,
  getVerifications,
  reviewRefund,
  reviewVerification,
  updateDispute,
} from "../managerApi";

const labels = { PENDING: 'Chờ xử lý', ADDITIONAL_INFO_REQUIRED: 'Cần bổ sung', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', IN_PROGRESS: 'Đang xử lý', WAITING_PARTNER: 'Chờ đối tác', RESOLVED: 'Đã giải quyết', REQUESTED: 'Mới yêu cầu', UNDER_REVIEW: 'Đang xem xét', PROCESSED: 'Đã hoàn tiền', WITHDRAWN: 'Khách đã rút' };
const tone = (status) => ['APPROVED', 'RESOLVED', 'PROCESSED'].includes(status) ? 'success' : status === 'REJECTED' ? 'danger' : status === 'WITHDRAWN' ? 'neutral' : ['IN_PROGRESS', 'WAITING_PARTNER', 'UNDER_REVIEW'].includes(status) ? 'progress' : status === 'ADDITIONAL_INFO_REQUIRED' ? 'neutral' : 'pending';
const configs = { verifications: { title: 'Xác minh khách sạn', key: 'verifications', get: getVerifications, statuses: ['PENDING', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED'] }, disputes: { title: 'Tranh chấp & hỗ trợ', key: 'disputes', get: getDisputes, statuses: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED', 'WITHDRAWN'] }, refunds: { title: 'Phê duyệt hoàn tiền', key: 'refunds', get: getRefunds, statuses: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSED'] } };

const policies = { one: 'Hủy miễn phí trước 1 ngày', three: 'Hủy miễn phí trước 3 ngày', none: 'Không hoàn hủy' };
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const Row = ({ label, children }) => children ? <div className="mb-1"><strong>{label}: </strong>{children}</div> : null;

const VerificationDetail = ({ item, onClose }) => {
  const hotel = item?.hotelId || {}; const partner = item?.partnerId || {}; const legal = hotel.legalProfile || {}; const owner = legal.beneficiary || {};
  const rooms = (hotel.roomTypes || []).filter((room) => room && room.name);
  return <Modal show={!!item} onHide={onClose} size="lg" scrollable centered>
    <Modal.Header closeButton><Modal.Title>{hotel.name || 'Chi tiết khách sạn'}</Modal.Title></Modal.Header>
    <Modal.Body>
      {!!hotel.images?.length && <div className="d-flex gap-2 flex-wrap mb-3">{hotel.images.map((image, index) => <img key={image.url || index} src={image.url} alt="" style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 8 }} />)}</div>}
      <h6>Thông tin khách sạn</h6>
      <Row label="Địa chỉ">{[hotel.address, hotel.provinceCity].filter(Boolean).join(', ')}</Row>
      <Row label="Hạng sao">{hotel.starRating && `${hotel.starRating} sao`}</Row>
      <Row label="Nhận / trả phòng">{hotel.checkInTime && `${hotel.checkInTime} / ${hotel.checkOutTime}`}</Row>
      <Row label="Chính sách hủy">{policies[hotel.cancellationPolicy]}</Row>
      <Row label="Mô tả">{hotel.description}</Row>
      <Row label="Tiện nghi">{hotel.amenities?.join(', ')}</Row>
      <h6 className="mt-3">Loại phòng ({rooms.length})</h6>
      {rooms.length ? rooms.map((room) => <div key={room._id} className="border rounded p-2 mb-2"><strong>{room.name}</strong> · {money(room.basePrice)}/đêm<div className="small text-muted">{room.bedType} · {room.roomSize} m² · {room.adultCapacity} người lớn{room.childrenCapacity ? `, ${room.childrenCapacity} trẻ em` : ''} · {room.totalRooms} phòng</div></div>) : <div className="text-muted">Chưa có loại phòng.</div>}
      <h6 className="mt-3">Đối tác</h6>
      <Row label="Họ tên">{partner.fullName}</Row><Row label="Email">{partner.email}</Row><Row label="Điện thoại">{partner.phoneNumber}</Row>
      <h6 className="mt-3">Hồ sơ pháp lý</h6>
      <Row label="Tên pháp lý">{legal.businessName}</Row><Row label="Địa chỉ pháp lý">{legal.legalAddress}</Row><Row label="Quốc gia">{legal.country}</Row>
      <Row label="Chủ sở hữu">{[owner.firstName, owner.lastName].filter(Boolean).join(' ')}</Row>
      {!!item?.documents?.length && <Row label="Tài liệu">{item.documents.map((doc) => <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="me-2">{doc.name}</a>)}</Row>}
      {item?.reviewNote && <Alert variant="secondary" className="mt-3 mb-0"><strong>Ghi chú xử lý:</strong> {item.reviewNote}</Alert>}
    </Modal.Body>
  </Modal>;
};

const ManagerQueuePage = ({ type }) => {
  const [detail, setDetail] = useState(null);
  const config = configs[type]; const [items, setItems] = useState([]); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const response = await config.get(status ? { status } : undefined); setItems(response.data[config.key] || []); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải dữ liệu.'); } finally { setLoading(false); } }, [config, status]);
  useEffect(() => { load(); }, [load]);
  const act = async (item, action) => { try { if (type === 'verifications') { const note = action === 'APPROVE' ? '' : window.prompt('Nhập lý do:'); if (action !== 'APPROVE' && !note) return; await reviewVerification(item._id, { decision: action, note }); } else if (type === 'disputes') { const resolutionMessage = action === 'RESOLVE' ? window.prompt('Nhập kết luận:') : ''; if (action === 'RESOLVE' && !resolutionMessage) return; await updateDispute(item._id, action === 'ASSIGN' ? { assignedToMe: true, status: 'IN_PROGRESS' } : { status: action === 'WAIT' ? 'WAITING_PARTNER' : 'RESOLVED', resolutionMessage }); } else { if (action === 'APPROVE') { const approvedAmount = window.prompt('Số tiền hoàn:', item.requestedAmount); if (approvedAmount === null) return; await reviewRefund(item._id, { decision: 'APPROVE', approvedAmount }); } else if (action === 'REJECT') { const note = window.prompt('Nhập lý do:'); if (!note) return; await reviewRefund(item._id, { decision: 'REJECT', note }); } else await reviewRefund(item._id, { decision: 'MARK_PROCESSED' }); } await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể cập nhật yêu cầu.'); } };
  const name = (item) => type === 'verifications' ? item.hotelId?.name : type === 'disputes' ? item.bookingCode : item.hotelId?.name;
  return <div><div className="om-page-heading"><div><h2>{config.title}</h2><p>Kiểm tra và xử lý các yêu cầu theo đúng quy trình vận hành.</p></div><Form.Select value={status} onChange={(event) => setStatus(event.target.value)} style={{ maxWidth: 220 }}><option value="">Tất cả trạng thái</option>{config.statuses.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</Form.Select></div>{error && <Alert variant="danger">{error}</Alert>}<Card className="om-card"><div className="om-section-header"><h3 className="om-card-title">Danh sách yêu cầu</h3></div>{loading ? <div className="om-empty"><Spinner /></div> : <Table responsive hover className="om-table align-middle"><thead><tr><th>Thông tin</th><th>Trạng thái</th><th>Ngày tạo</th><th className="text-end">Thao tác</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item._id}><td><span className="om-primary-text">{name(item) || 'Không xác định'}</span><span className="om-secondary-text">{type === 'disputes' ? item.category : item.partnerId?.fullName || item.customerId?.fullName}</span></td><td><span className={`om-status ${tone(item.status)}`}>{labels[item.status] || item.status}</span></td><td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td><td className="text-end"><div className="om-actions">{type === 'verifications' && <Button className="om-action" size="sm" variant="outline-secondary" onClick={() => setDetail(item)}>Xem</Button>}{type === 'verifications' && !['APPROVED', 'REJECTED'].includes(item.status) && <><Button className="om-action" size="sm" variant="success" onClick={() => act(item, 'APPROVE')}>Duyệt</Button><Button className="om-action" size="sm" variant="outline-primary" onClick={() => act(item, 'REQUEST_INFO')}>Bổ sung</Button><Button className="om-action" size="sm" variant="outline-danger" onClick={() => act(item, 'REJECT')}>Từ chối</Button></>}{type === 'disputes' && item.status === 'WITHDRAWN' && <span className="om-secondary-text">Không cần xử lý</span>}{type === 'disputes' && !['RESOLVED', 'REJECTED', 'WITHDRAWN'].includes(item.status) && <><Button className="om-action" size="sm" onClick={() => act(item, 'ASSIGN')}>Nhận xử lý</Button><Button className="om-action" size="sm" variant="outline-secondary" onClick={() => act(item, 'WAIT')}>Chờ đối tác</Button><Button className="om-action" size="sm" variant="success" onClick={() => act(item, 'RESOLVE')}>Giải quyết</Button></>}{type === 'refunds' && item.status === 'REQUESTED' && <><Button className="om-action" size="sm" variant="success" onClick={() => act(item, 'APPROVE')}>Duyệt</Button><Button className="om-action" size="sm" variant="outline-danger" onClick={() => act(item, 'REJECT')}>Từ chối</Button></>}{type === 'refunds' && item.status === 'APPROVED' && <Button className="om-action" size="sm" onClick={() => act(item, 'PROCESSED')}>Xác nhận hoàn</Button>}</div></td></tr>) : <tr><td colSpan="4" className="om-empty">Không có yêu cầu phù hợp.</td></tr>}</tbody></Table>}</Card>{type === 'verifications' && <VerificationDetail item={detail} onClose={() => setDetail(null)} />}</div>;
};
export default ManagerQueuePage;
