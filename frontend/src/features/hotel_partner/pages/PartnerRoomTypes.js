import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner, Table } from "react-bootstrap";
import { FaEdit, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { deleteRoomType, getRoomTypes, updateRoomTypeStatus } from "../partnerApi";

// Trạng thái theo RoomType.status
const STATUS_LABEL = { ACTIVE: "Mở bán", INACTIVE: "Ngừng bán" };
const HOTEL_STATUS_LABEL = { ACTIVE: "Đã phê duyệt" };

const PartnerRoomTypes = () => {
  const { token } = useContext(AuthContext);
  // Khách sạn và danh sách loại phòng cùng lấy từ GET /api/partner/room-types
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const filteredRooms = useMemo(() => rooms.filter((room) => room.name.toLowerCase().includes(keyword.toLowerCase()) && (!status || room.status === status)), [rooms, keyword, status]);
  const activeCount = rooms.filter((room) => room.status === "ACTIVE").length;
  const totalRooms = rooms.reduce((sum, room) => sum + (room.totalRooms || 0), 0);
  const runAction = async (room, action, fallbackMessage) => {
    setBusyId(room._id);
    setActionError("");
    try {
      await action();
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || fallbackMessage);
    } finally {
      setBusyId("");
    }
  };
  const changeStatus = (room) => runAction(room, async () => {
    const { data } = await updateRoomTypeStatus(room._id, room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", token);
    setRooms((current) => current.map((item) => item._id === room._id ? data.roomType : item));
  }, "Không thể đổi trạng thái loại phòng.");
  const remove = (room) => {
    if (!window.confirm(`Xóa ${room.name}?`)) return;
    runAction(room, async () => {
      await deleteRoomType(room._id, token);
      setRooms((current) => current.filter((item) => item._id !== room._id));
    }, "Không thể xóa loại phòng.");
  };

  useEffect(() => {
    getRoomTypes(token)
      .then(({ data }) => { setHotel(data.hotel); setRooms(data.roomTypes); })
      .catch((requestError) => setError(requestError.response?.data?.message || "Không thể tải danh sách loại phòng."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center p-5"><Spinner /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
    <div className="text-muted small mb-3">Khách sạn của tôi / Loại phòng</div>
    <h1 className="h3 fw-bold mb-4">Quản lý loại phòng</h1>
    {actionError && <Alert variant="danger" dismissible onClose={() => setActionError("")}>{actionError}</Alert>}
    <Card className="border-0 shadow-sm rounded-4 mb-4"><Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 p-md-4"><div><strong>{hotel?.name}</strong><div className="text-muted small mt-1">{[hotel?.provinceCity, hotel?.address].filter(Boolean).join(" · ")}</div></div>{hotel?.status && <Badge bg="light" text="dark" className="border">{HOTEL_STATUS_LABEL[hotel.status] || hotel.status}</Badge>}</Card.Body></Card>
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3"><div><h2 className="h5 fw-bold mb-1">{rooms.length} loại phòng</h2><div className="text-muted small">{activeCount} đang mở bán · {rooms.length - activeCount} ngừng bán · {totalRooms} phòng thực tế</div></div><Button as={Link} to="/partner/room-types/new" variant="dark"><FaPlus className="me-2" />Thêm loại phòng</Button></div>
    <div className="row g-2 mb-3"><Form.Group className="col-md-8"><Form.Label className="small fw-semibold">Tìm loại phòng</Form.Label><div className="input-group"><span className="input-group-text bg-white"><FaSearch /></span><Form.Control value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm kiếm theo tên loại phòng..." /></div></Form.Group><Form.Group className="col-md-3"><Form.Label className="small fw-semibold">Trạng thái</Form.Label><Form.Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group><div className="col-md-1 d-grid align-self-end"><Button variant="outline-dark">Tìm</Button></div></div>
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden"><Table responsive hover className="align-middle mb-0"><thead className="table-light"><tr><th>Ảnh</th><th>Tên loại phòng</th><th>Sức chứa tối đa</th><th>Số phòng thực tế</th><th>Giá cơ bản VND / đêm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filteredRooms.map((room) => <tr key={room._id}><td>{room.images?.[0]?.url ? <img src={room.images[0].url} alt="" className="rounded" style={{ width: 48, height: 48, objectFit: "cover" }} /> : <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: 48, height: 48 }}>▧</div>}</td><td><strong>{room.name}</strong><div className="text-muted small">{[room.bedType, room.roomSize && `${room.roomSize} m²`].filter(Boolean).join(" · ")}</div></td><td className="small">{room.adultCapacity} người lớn{room.childrenCapacity ? `, ${room.childrenCapacity} trẻ em` : ""}</td><td>{room.totalRooms}</td><td>{room.basePrice?.toLocaleString("vi-VN")}</td><td><Badge bg="light" text="dark" className="border fw-normal">{STATUS_LABEL[room.status] || room.status}</Badge></td><td className="text-nowrap"><Button variant="link" className="p-0 text-dark me-3" onClick={() => navigate(`/partner/room-types/${room._id}/edit`)}><FaEdit className="me-1" />Sửa</Button><Button variant="link" className="p-0 text-dark" disabled={busyId === room._id} onClick={() => changeStatus(room)}>{room.status === "ACTIVE" ? "Ngừng bán" : "Mở bán"}</Button><div><Button variant="link" className="p-0 text-dark small" disabled={busyId === room._id} onClick={() => remove(room)}><FaTrash className="me-1" />Xóa</Button></div></td></tr>)}{!filteredRooms.length && <tr><td colSpan="7" className="text-center text-muted py-5">{rooms.length ? "Không tìm thấy loại phòng phù hợp." : "Chưa có loại phòng nào."}</td></tr>}</tbody></Table><Card.Footer className="bg-white text-muted small">Hiển thị {filteredRooms.length} trong {rooms.length} loại phòng</Card.Footer></Card>
  </div>;
};

export default PartnerRoomTypes;
