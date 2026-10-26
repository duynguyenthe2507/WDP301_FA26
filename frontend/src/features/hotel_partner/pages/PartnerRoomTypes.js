import { useMemo, useState } from "react";
import { Badge, Button, Card, Form, Table } from "react-bootstrap";
import { FaEdit, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const initialRooms = [
  { id: "deluxe", name: "Deluxe hướng sông", detail: "1 giường đôi King · 32 m²", capacity: "2 người lớn, 1 trẻ em", total: 12, price: "1.500.000", status: "Mở bán" },
  { id: "superior", name: "Superior hai giường", detail: "2 giường đơn · 28 m²", capacity: "2 người lớn", total: 18, price: "1.100.000", status: "Mở bán" },
  { id: "suite", name: "Suite gia đình", detail: "2 giường đôi Queen · 52 m²", capacity: "4 người lớn, 2 trẻ em", total: 6, price: "2.800.000", status: "Mở bán" },
  { id: "standard", name: "Standard giường đôi", detail: "1 giường đôi Queen · 24 m²", capacity: "2 người lớn", total: 10, price: "850.000", status: "Ngừng bán" },
];

const PartnerRoomTypes = () => {
  const [rooms, setRooms] = useState(initialRooms);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const navigate = useNavigate();
  const filteredRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(keyword.toLowerCase()) && (status === "Tất cả trạng thái" || room.status === status)), [rooms, keyword, status]);
  const changeStatus = (id) => setRooms((current) => current.map((room) => room.id === id ? { ...room, status: room.status === "Mở bán" ? "Ngừng bán" : "Mở bán" } : room));
  const remove = (room) => { if (window.confirm(`Xóa ${room.name}?`)) setRooms((current) => current.filter((item) => item.id !== room.id)); };

  return <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
    <div className="text-muted small mb-3">Khách sạn của tôi / Loại phòng</div>
    <h1 className="h3 fw-bold mb-4">Quản lý loại phòng</h1>
    <Card className="border-0 shadow-sm rounded-4 mb-4"><Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 p-md-4"><div><strong>Khách sạn An Nhiên Riverside</strong><div className="text-muted small mt-1">Đà Nẵng · 12 Bạch Đằng, Hải Châu</div></div><div><Badge bg="light" text="dark" className="border me-2">Đã phê duyệt</Badge><Button variant="link" size="sm" className="text-dark text-decoration-none">Đổi khách sạn⌄</Button></div></Card.Body></Card>
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3"><div><h2 className="h5 fw-bold mb-1">{rooms.length} loại phòng</h2><div className="text-muted small">3 đang mở bán · 1 ngừng bán · 46 phòng thực tế</div></div><Button as={Link} to="/partner/room-types/new" variant="dark"><FaPlus className="me-2" />Thêm loại phòng</Button></div>
    <div className="row g-2 mb-3"><Form.Group className="col-md-8"><Form.Label className="small fw-semibold">Tìm loại phòng</Form.Label><div className="input-group"><span className="input-group-text bg-white"><FaSearch /></span><Form.Control value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm kiếm theo tên loại phòng..." /></div></Form.Group><Form.Group className="col-md-3"><Form.Label className="small fw-semibold">Trạng thái</Form.Label><Form.Select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tất cả trạng thái</option><option>Mở bán</option><option>Ngừng bán</option></Form.Select></Form.Group><div className="col-md-1 d-grid align-self-end"><Button variant="outline-dark">Tìm</Button></div></div>
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden"><Table responsive hover className="align-middle mb-0"><thead className="table-light"><tr><th>Ảnh</th><th>Tên loại phòng</th><th>Sức chứa tối đa</th><th>Số phòng thực tế</th><th>Giá cơ bản VND / đêm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filteredRooms.map((room) => <tr key={room.id}><td><div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: 48, height: 48 }}>▧</div></td><td><strong>{room.name}</strong><div className="text-muted small">{room.detail}</div></td><td className="small">{room.capacity}</td><td>{room.total}</td><td>{room.price}</td><td><Badge bg="light" text="dark" className="border fw-normal">{room.status}</Badge></td><td className="text-nowrap"><Button variant="link" className="p-0 text-dark me-3" onClick={() => navigate(`/partner/room-types/${room.id}/edit`)}><FaEdit className="me-1" />Sửa</Button><Button variant="link" className="p-0 text-dark" onClick={() => changeStatus(room.id)}>{room.status === "Mở bán" ? "Ngừng bán" : "Mở bán"}</Button><div><Button variant="link" className="p-0 text-dark small" onClick={() => remove(room)}><FaTrash className="me-1" />Xóa</Button></div></td></tr>)}{!filteredRooms.length && <tr><td colSpan="7" className="text-center text-muted py-5">Không tìm thấy loại phòng phù hợp.</td></tr>}</tbody></Table><Card.Footer className="bg-white text-muted small">Hiển thị 1–{filteredRooms.length} trong {rooms.length} loại phòng</Card.Footer></Card>
  </div>;
};

export default PartnerRoomTypes;
