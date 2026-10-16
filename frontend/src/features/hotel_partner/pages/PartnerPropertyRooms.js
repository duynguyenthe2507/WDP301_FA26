import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaInfoCircle, FaMinus, FaPlus } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";

const blankRoom = () => ({ type: "Deluxe giường đôi hoặc 2 giường", size: "20", guests: 2, bathrooms: 1, price: "2000000", extraGuests: 1, extraPrice: "1" });
const Counter = ({ value, onChange, min = 0 }) => <div className="d-flex align-items-center gap-3"><Button variant="outline-secondary" size="sm" className="rounded-circle p-0" style={{ width: 21, height: 21 }} disabled={value <= min} onClick={() => onChange(value - 1)}><FaMinus size={9} /></Button><span>{value}</span><Button variant="outline-primary" size="sm" className="rounded-circle p-0" style={{ width: 21, height: 21 }} onClick={() => onChange(value + 1)}><FaPlus size={9} /></Button></div>;

const PartnerPropertyRooms = () => {
  const [rooms, setRooms] = useState([blankRoom()]);
  const [breakfast, setBreakfast] = useState(true);
  const [breakfastPrice, setBreakfastPrice] = useState("2");
  const updateRoom = (roomIndex, field, value) => setRooms(current => current.map((room, index) => index === roomIndex ? { ...room, [field]: value } : room));
  const labelStyle = { fontSize: 12 };
  return <PropertySetupLayout step={2} title="Thiết lập phòng & giá của bạn" previous="/partner/property-amenities" next="/partner/property-photos">
    <div className="rounded-3 p-3 mb-3" style={{ background: "#e7f0ff", color: "#0754bd", fontSize: 12 }}><FaInfoCircle className="me-2" />Mẹo: Bắt đầu với một phòng riêng lẻ. Dễ dàng thêm nhiều phòng hơn sau khi hoàn tất đăng thông tin.</div>
    {rooms.map((room, roomIndex) => <section key={roomIndex} className="mb-4"><h2 className="h6 fw-semibold my-3">Room {roomIndex + 1}</h2><div className="rounded-3 p-3" style={{ background: "#f5f7fa" }}>
      <div className="row g-3"><div className="col-md-7"><Form.Group><Form.Label style={labelStyle}>Loại phòng</Form.Label><Form.Select value={room.type} onChange={e => updateRoom(roomIndex, "type", e.target.value)}><option>Deluxe giường đôi hoặc 2 giường</option><option>Phòng đôi tiêu chuẩn</option></Form.Select></Form.Group></div><div className="col-md-5"><Form.Group><Form.Label style={labelStyle}>Kích thước phòng (m²)</Form.Label><Form.Control value={room.size} onChange={e => updateRoom(roomIndex, "size", e.target.value)} /></Form.Group></div></div>
      <div className="d-flex justify-content-between align-items-center py-3 border-bottom" style={labelStyle}><span>Giới hạn về tổng số khách lưu trú</span><Counter value={room.guests} min={1} onChange={value => updateRoom(roomIndex, "guests", value)} /></div><div className="d-flex justify-content-between align-items-center py-3 border-bottom" style={labelStyle}><span>Phòng tắm</span><Counter value={room.bathrooms} onChange={value => updateRoom(roomIndex, "bathrooms", value)} /></div>
      <Form.Group className="pt-3"><Form.Label style={labelStyle}>Giá phòng tối thiểu (VND / đêm)</Form.Label><Form.Control value={room.price} onChange={e => updateRoom(roomIndex, "price", e.target.value)} /><Form.Text>Thiết lập giá thấp nhất có thể cho phòng này, không bao gồm khuyến mại và thuế.</Form.Text></Form.Group><div className="d-flex justify-content-between align-items-center py-3" style={labelStyle}><span>Số lượng khách áp dụng cho giá phòng này mỗi đêm</span><Counter value={room.extraGuests} min={1} onChange={value => updateRoom(roomIndex, "extraGuests", value)} /></div><Form.Group><Form.Label style={labelStyle}>Giá cho khách bổ sung (VND / đêm)</Form.Label><Form.Control value={room.extraPrice} onChange={e => updateRoom(roomIndex, "extraPrice", e.target.value)} /></Form.Group>
    </div></section>)}
    <Button variant="outline-primary" className="rounded-pill px-3 mb-3" size="sm" onClick={() => setRooms(current => [...current, blankRoom()])}><FaPlus className="me-2" />Thêm căn</Button>
    <div className="rounded-3 p-3 mb-3" style={{ background: "#e7f0ff", color: "#0754bd", fontSize: 12 }}><FaInfoCircle className="me-2" />Chúng tôi sẽ thiết lập giá và tình trạng phòng trống cho mỗi phòng trong 90 ngày tới.</div>
    <div className="border-top pt-3"><h2 className="h6 fw-semibold">Breakfast</h2><p className="text-muted" style={labelStyle}>Cơ sở lưu trú của quý đối tác có cung cấp bữa sáng hay không?</p><Form.Check type="radio" label="Có" checked={breakfast} onChange={() => setBreakfast(true)} style={labelStyle} /><Form.Check type="radio" label="Không" checked={!breakfast} onChange={() => setBreakfast(false)} style={labelStyle} />{breakfast && <Form.Group className="mt-3"><Form.Label style={labelStyle}>Chi phí bữa sáng mỗi khách mỗi đêm (VND / đêm)</Form.Label><Form.Control value={breakfastPrice} onChange={e => setBreakfastPrice(e.target.value)} /></Form.Group>}</div>
  </PropertySetupLayout>;
};
export default PartnerPropertyRooms;
