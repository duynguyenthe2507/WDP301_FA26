import { useContext, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaImage, FaSave, FaUpload } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { getRoomType } from "../partnerApi";

const amenities = ["Wi-Fi miễn phí", "Điều hòa", "TV màn hình phẳng", "Minibar", "Ban công", "Bồn tắm", "Két an toàn", "Bàn làm việc"];
const BED_TYPES = ["Giường đôi King", "Giường đôi Queen", "2 giường đơn"];
const emptyRoom = { name: "", description: "", bedType: "", beds: "", size: "", adults: "", children: "", total: "", price: "", amenities: [], images: [], status: "ACTIVE" };

// Đổi loại phòng từ model (Hotel.roomTypes) sang các ô của form
const toForm = (roomType) => ({
  ...emptyRoom,
  name: roomType.name || "",
  description: roomType.description || "",
  bedType: roomType.bedType || "",
  size: roomType.roomSize ?? "",
  adults: roomType.adultCapacity ?? "",
  children: roomType.childrenCapacity ?? "",
  total: roomType.totalRooms ?? "",
  price: roomType.basePrice ?? "",
  amenities: roomType.amenities || [],
  images: roomType.images || [],
  status: roomType.status || "ACTIVE",
});

const RoomTypeForm = ({ edit }) => {
  const { token } = useContext(AuthContext);
  const { roomTypeId } = useParams();
  const [room, setRoom] = useState(emptyRoom);
  const [loading, setLoading] = useState(edit);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  // Màn sửa nạp dữ liệu từ GET /api/partner/room-types/:id
  useEffect(() => {
    if (!edit) return;
    getRoomType(roomTypeId, token)
      .then(({ data }) => setRoom(toForm(data.roomType)))
      .catch((requestError) => setError(requestError.response?.data?.message || "Không thể tải loại phòng."))
      .finally(() => setLoading(false));
  }, [edit, roomTypeId, token]);

  const update = (event) => setRoom((current) => ({ ...current, [event.target.name]: event.target.value }));
  const toggleAmenity = (item) => setRoom((current) => ({ ...current, amenities: current.amenities.includes(item) ? current.amenities.filter((value) => value !== item) : [...current.amenities, item] }));
  const submit = (event) => { event.preventDefault(); setSaved(true); setTimeout(() => navigate("/partner/room-types"), 600); };
  const field = (label, props, className = "col-12") => <Form.Group className={className}><Form.Label>{label} <span className="text-danger">*</span></Form.Label><Form.Control required {...props} /></Form.Group>;
  // Giữ loại giường nhập tự do từ wizard đăng ký để ô chọn không bị trống
  const bedTypes = room.bedType && !BED_TYPES.includes(room.bedType) ? [...BED_TYPES, room.bedType] : BED_TYPES;

  if (loading) return <div className="text-center p-5"><Spinner /></div>;
  if (error) return <Alert variant="danger">{error} <Link to="/partner/room-types">Quay lại danh sách</Link></Alert>;

  return <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
    <div className="text-muted small mb-3">Khách sạn của tôi / Loại phòng / {edit ? "Chỉnh sửa" : "Thêm mới"}</div><h1 className="h3 fw-bold mb-3">{edit ? "Chỉnh sửa loại phòng" : "Thêm loại phòng"}</h1><Link to="/partner/room-types" className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại danh sách loại phòng</Link>
    {edit ? <><div className="d-flex justify-content-between align-items-center mt-2 mb-3"><strong>{room.name}</strong><Button variant="outline-dark" size="sm">{room.status === "ACTIVE" ? "Ngừng bán" : "Mở bán"}</Button></div><Alert variant="light" className="border small"><strong>Chỉ áp dụng thay đổi cho các đặt phòng trong tương lai</strong><br />Thay đổi giá, sức chứa, tiện nghi và chính sách chỉ áp dụng cho đặt phòng mới phát sinh sau khi lưu.</Alert></> : <p className="text-muted small mt-3">Tạo loại phòng mới cho Khách sạn. Điền thông tin, giá cơ bản và tải ảnh trước khi lưu.</p>}
    {saved && <Alert variant="success">Đã lưu loại phòng. Đang trở lại danh sách...</Alert>}
    <Form onSubmit={submit} className="mt-3"><Section title="Thông tin loại phòng" description={!edit && "Các trường có dấu * là bắt buộc. Tên loại phòng phải duy nhất trong khách sạn."}><div className="row g-3">{field("Tên loại phòng", { name: "name", value: room.name, onChange: update, placeholder: "Ví dụ: Deluxe hướng sông" })}{field("Mô tả", { as: "textarea", rows: 3, name: "description", value: room.description, onChange: update, placeholder: "Giới thiệu không gian, tầm nhìn và các điểm nổi bật của loại phòng..." })}<Form.Group className="col-md-6"><Form.Label>Loại giường <span className="text-danger">*</span></Form.Label><Form.Select required name="bedType" value={room.bedType} onChange={update}><option value="">Chọn loại giường</option>{bedTypes.map((bedType) => <option key={bedType}>{bedType}</option>)}</Form.Select></Form.Group>{field("Số giường", { type: "number", min: "1", name: "beds", value: room.beds, onChange: update, placeholder: "Nhập số giường" }, "col-md-6")}{field("Diện tích phòng (m²)", { type: "number", min: "1", name: "size", value: room.size, onChange: update, placeholder: "Ví dụ: 32" }, "col-md-6")}<div className="col-md-6 align-self-end small text-muted pb-2">+ Thêm cấu hình giường<br />Thêm loại giường khác nếu phòng có nhiều loại giường.</div></div></Section>
      <Section title="Sức chứa & số lượng phòng" description="Sức chứa tính cho mỗi phòng. Tổng số người lớn và trẻ em phải từ 1 trở lên."><div className="row g-3">{field("Người lớn tối đa", { type: "number", min: "1", name: "adults", value: room.adults, onChange: update, placeholder: "Ví dụ: 2" }, "col-md-6")}{field("Trẻ em tối đa", { type: "number", min: "0", name: "children", value: room.children, onChange: update, placeholder: "Ví dụ: 1" }, "col-md-6")}{field("Số lượng phòng thực tế", { type: "number", min: "1", name: "total", value: room.total, onChange: update, placeholder: "Nhập tổng số phòng thuộc loại phòng này" })}</div></Section>
      <Section title="Giá cơ bản" description="Giá cho một phòng trong một đêm, đơn vị Việt Nam Đồng (VND).">{field("Giá cơ bản / phòng / đêm (VND)", { name: "price", value: room.price, onChange: update, placeholder: "Ví dụ: 1.500.000" })}</Section>
      <Section title="Tiện nghi trong phòng" description="Chọn các tiện nghi có sẵn cho loại phòng này."><div className="row row-cols-2 row-cols-md-4 g-2">{amenities.map((item) => <Form.Check key={item} className="col" label={item} checked={room.amenities.includes(item)} onChange={() => toggleAmenity(item)} />)}</div></Section>
      <Section title="Ảnh loại phòng" description="Tải lên ít nhất 1 ảnh. Ảnh đầu tiên được dùng làm ảnh đại diện."><div className="row g-3 mb-3">{["Ảnh đại diện", "Ảnh phòng", "Ảnh tiện nghi"].map((item) => <div key={item} className="col-md-4"><div className="bg-light border rounded-3 d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: 120 }}><FaImage className="mb-2" /><small>+ {item}</small></div></div>)}</div><div className="border border-2 border-dashed rounded-3 p-4 text-center text-muted"><FaUpload className="mb-2" /><div>Kéo thả ảnh phòng vào đây hoặc chọn tệp</div><Button variant="outline-dark" size="sm" type="button" className="mt-2">Chọn ảnh</Button><div className="small mt-2">JPG/PNG · Tối đa 5 MB/ảnh · 1–10 ảnh</div></div></Section>
      <div className="d-flex gap-2 pb-4"><Button type="button" variant="outline-secondary" onClick={() => navigate("/partner/room-types")}>Hủy</Button><Button type="submit" variant="dark"><FaSave className="me-2" />{edit ? "Lưu thay đổi" : "Lưu loại phòng"}</Button></div>
    </Form>
  </div>;
};

const Section = ({ title, description, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-1">{title}</h2>{description && <p className="text-muted small mb-3">{description}</p>}{children}</Card.Body></Card>;
export const PartnerAddRoomType = () => <RoomTypeForm edit={false} />;
export const PartnerEditRoomType = () => <RoomTypeForm edit />;
