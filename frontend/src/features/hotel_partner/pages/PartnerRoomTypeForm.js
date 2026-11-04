import { useContext, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaImage, FaSave } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import ImageUploadButton from "../components/ImageUploadButton";
import { BED_TYPES } from "../data/hotelOptions";
import { createRoomType, getRoomType, updateRoomType, updateRoomTypeStatus } from "../partnerApi";

const amenities = ["Wi-Fi miễn phí", "Điều hòa", "TV màn hình phẳng", "Minibar", "Ban công", "Bồn tắm", "Két an toàn", "Bàn làm việc"];
const MAX_IMAGES = 10;
const emptyRoom = { name: "", description: "", bedType: "", size: "", adults: "", children: "", total: "", price: "", amenities: [], images: [], status: "ACTIVE" };

// Đổi loại phòng từ model (RoomType) sang các ô của form
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

// Đổi các ô của form về đúng tên trường của RoomType
const toPayload = (room) => ({
  name: room.name,
  description: room.description,
  bedType: room.bedType,
  roomSize: room.size,
  adultCapacity: room.adults,
  childrenCapacity: room.children,
  totalRooms: room.total,
  basePrice: room.price,
  amenities: room.amenities,
  images: room.images,
});

const RoomTypeForm = ({ edit }) => {
  const { token } = useContext(AuthContext);
  const { roomTypeId } = useParams();
  const [room, setRoom] = useState(emptyRoom);
  const [loading, setLoading] = useState(edit);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  // Màn sửa nạp dữ liệu từ GET /api/partner/room-types/:id
  useEffect(() => {
    if (!edit) return;
    getRoomType(roomTypeId, token)
      .then(({ data }) => setRoom(toForm(data.roomType)))
      .catch((requestError) => setLoadError(requestError.response?.data?.message || "Không thể tải loại phòng."))
      .finally(() => setLoading(false));
  }, [edit, roomTypeId, token]);

  const update = (event) => setRoom((current) => ({ ...current, [event.target.name]: event.target.value }));
  const toggleAmenity = (item) => setRoom((current) => ({ ...current, amenities: current.amenities.includes(item) ? current.amenities.filter((value) => value !== item) : [...current.amenities, item] }));
  // Upload chạy bất đồng bộ nên cập nhật theo state mới nhất
  const addImages = (images) => setRoom((current) => ({ ...current, images: [...current.images, ...images] }));
  const removeImage = (index) => setRoom((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }));
  const moveImage = (index, offset) => setRoom((current) => {
    const images = [...current.images];
    [images[index], images[index + offset]] = [images[index + offset], images[index]];
    return { ...current, images };
  });
  const toggleStatus = async () => {
    setChangingStatus(true);
    setSaveError("");
    try {
      const { data } = await updateRoomTypeStatus(roomTypeId, room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", token);
      setRoom((current) => ({ ...current, status: data.roomType.status }));
    } catch (requestError) {
      setSaveError(requestError.response?.data?.message || "Không thể đổi trạng thái loại phòng.");
    } finally {
      setChangingStatus(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!room.images.length) { setSaveError("Vui lòng tải lên ít nhất 1 ảnh loại phòng."); return; }
    setSaving(true);
    setSaveError("");
    try {
      if (edit) await updateRoomType(roomTypeId, toPayload(room), token);
      else await createRoomType(toPayload(room), token);
      setSaved(true);
      setTimeout(() => navigate("/partner/room-types"), 600);
    } catch (requestError) {
      setSaveError(requestError.response?.data?.message || "Không thể lưu loại phòng.");
    } finally {
      setSaving(false);
    }
  };
  const field = (label, props, className = "col-12") => <Form.Group className={className}><Form.Label>{label} {props.required !== false && <span className="text-danger">*</span>}</Form.Label><Form.Control required {...props} /></Form.Group>;
  // Giữ loại giường ngoài danh sách (dữ liệu cũ / seed) để ô chọn không bị trống
  const bedTypes = room.bedType && !BED_TYPES.includes(room.bedType) ? [...BED_TYPES, room.bedType] : BED_TYPES;
  // Tiện nghi nhập tự do lúc đăng ký cũng phải hiện ra để partner bỏ chọn được
  const amenityOptions = [...amenities, ...room.amenities.filter((item) => !amenities.includes(item))];

  if (loading) return <div className="text-center p-5"><Spinner /></div>;
  if (loadError) return <Alert variant="danger">{loadError} <Link to="/partner/room-types">Quay lại danh sách</Link></Alert>;

  return <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
    <div className="text-muted small mb-3">Khách sạn của tôi / Loại phòng / {edit ? "Chỉnh sửa" : "Thêm mới"}</div><h1 className="h3 fw-bold mb-3">{edit ? "Chỉnh sửa loại phòng" : "Thêm loại phòng"}</h1><Link to="/partner/room-types" className="small text-dark text-decoration-none"><FaArrowLeft className="me-1" />Quay lại danh sách loại phòng</Link>
    {edit ? <><div className="d-flex justify-content-between align-items-center mt-2 mb-3"><strong>{room.name}</strong><Button variant="outline-dark" size="sm" disabled={changingStatus} onClick={toggleStatus}>{room.status === "ACTIVE" ? "Ngừng bán" : "Mở bán"}</Button></div><Alert variant="light" className="border small"><strong>Chỉ áp dụng thay đổi cho các đặt phòng trong tương lai</strong><br />Thay đổi giá, sức chứa, tiện nghi và chính sách chỉ áp dụng cho đặt phòng mới phát sinh sau khi lưu.</Alert></> : <p className="text-muted small mt-3">Tạo loại phòng mới cho Khách sạn. Điền thông tin, giá cơ bản và tải ảnh trước khi lưu.</p>}
    <Form onSubmit={submit} className="mt-3"><Section title="Thông tin loại phòng" description={!edit && "Các trường có dấu * là bắt buộc. Tên loại phòng phải duy nhất trong khách sạn."}><div className="row g-3">{field("Tên loại phòng", { name: "name", value: room.name, onChange: update, placeholder: "Ví dụ: Deluxe hướng sông" })}{field("Mô tả", { required: false, as: "textarea", rows: 3, name: "description", value: room.description, onChange: update, placeholder: "Giới thiệu không gian, tầm nhìn và các điểm nổi bật của loại phòng..." })}<Form.Group className="col-md-6"><Form.Label>Loại giường <span className="text-danger">*</span></Form.Label><Form.Select required name="bedType" value={room.bedType} onChange={update}><option value="">Chọn loại giường</option>{bedTypes.map((bedType) => <option key={bedType}>{bedType}</option>)}</Form.Select></Form.Group>{field("Diện tích phòng (m²)", { type: "number", min: "1", name: "size", value: room.size, onChange: update, placeholder: "Ví dụ: 32" }, "col-md-6")}</div></Section>
      <Section title="Sức chứa & số lượng phòng" description="Sức chứa tính cho mỗi phòng. Tổng số người lớn và trẻ em phải từ 1 trở lên."><div className="row g-3">{field("Người lớn tối đa", { type: "number", min: "1", step: "1", name: "adults", value: room.adults, onChange: update, placeholder: "Ví dụ: 2" }, "col-md-6")}{field("Trẻ em tối đa", { type: "number", min: "0", step: "1", name: "children", value: room.children, onChange: update, placeholder: "Ví dụ: 1" }, "col-md-6")}{field("Số lượng phòng thực tế", { type: "number", min: "1", step: "1", name: "total", value: room.total, onChange: update, placeholder: "Nhập tổng số phòng thuộc loại phòng này" })}</div></Section>
      <Section title="Giá cơ bản" description="Giá cho một phòng trong một đêm, đơn vị Việt Nam Đồng (VND).">{field("Giá cơ bản / phòng / đêm (VND)", { type: "number", min: "0", name: "price", value: room.price, onChange: update, placeholder: "Ví dụ: 1500000" })}</Section>
      <Section title="Tiện nghi trong phòng" description="Chọn các tiện nghi có sẵn cho loại phòng này."><div className="row row-cols-2 row-cols-md-4 g-2">{amenityOptions.map((item) => <Form.Check key={item} id={`room-amenity-${item}`} className="col" label={item} checked={room.amenities.includes(item)} onChange={() => toggleAmenity(item)} />)}</div></Section>
      <Section title="Ảnh loại phòng" description={`${room.images.length}/${MAX_IMAGES} ảnh · Tải lên ít nhất 1 ảnh. Ảnh đầu tiên được dùng làm ảnh đại diện.`}><div className="row g-3 mb-3">{room.images.length ? room.images.map((image, index) => <div key={image.url} className="col-6 col-md-3"><img src={image.url} alt="" className="w-100 border rounded-3" style={{ height: 120, objectFit: "cover" }} /><div className="d-flex justify-content-between small mt-2"><span><button className="btn btn-link p-0 text-dark small me-2 text-decoration-none" type="button" aria-label="Chuyển ảnh lên trước" disabled={index === 0} onClick={() => moveImage(index, -1)}>←</button><button className="btn btn-link p-0 text-dark small text-decoration-none" type="button" aria-label="Chuyển ảnh ra sau" disabled={index === room.images.length - 1} onClick={() => moveImage(index, 1)}>→</button></span><button className="btn btn-link p-0 text-dark small" type="button" onClick={() => removeImage(index)}>Xóa</button></div></div>) : <div className="col-12"><div className="bg-light border rounded-3 d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: 120 }}><FaImage className="mb-2" /><small>Chưa có ảnh</small></div></div>}</div><div className="border border-2 border-dashed rounded-3 p-4 text-center text-muted"><ImageUploadButton type="room" label="Chọn ảnh" maxFiles={MAX_IMAGES - room.images.length} onUploaded={addImages} /><div className="small mt-2">JPG/PNG/WEBP/GIF · Tối đa 5 MB/ảnh · 1–{MAX_IMAGES} ảnh</div></div></Section>
      {saveError && <Alert variant="danger" dismissible onClose={() => setSaveError("")}>{saveError}</Alert>}
      {saved && <Alert variant="success">Đã lưu loại phòng. Đang trở lại danh sách...</Alert>}
      <div className="d-flex gap-2 pb-4"><Button type="button" variant="outline-secondary" onClick={() => navigate("/partner/room-types")}>Hủy</Button><Button type="submit" variant="dark" disabled={saving || saved}>{saving ? <Spinner size="sm" className="me-2" /> : <FaSave className="me-2" />}{edit ? "Lưu thay đổi" : "Lưu loại phòng"}</Button></div>
    </Form>
  </div>;
};

const Section = ({ title, description, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-1">{title}</h2>{description && <p className="text-muted small mb-3">{description}</p>}{children}</Card.Body></Card>;
export const PartnerAddRoomType = () => <RoomTypeForm edit={false} />;
export const PartnerEditRoomType = () => <RoomTypeForm edit />;
