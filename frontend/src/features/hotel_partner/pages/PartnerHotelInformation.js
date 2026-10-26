import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { FaImage, FaSave, FaUpload } from "react-icons/fa";

const amenities = ["Wi-Fi miễn phí", "Hồ bơi", "Nhà hàng", "Bãi đỗ xe", "Phòng tập", "Lễ tân 24 giờ", "Đưa đón sân bay", "Spa"];
const initialForm = {
  name: "Khách sạn An Nhiên Riverside", stars: "4", city: "Đà Nẵng", district: "Hải Châu",
  address: "12 Bạch Đằng, Hải Châu, Đà Nẵng", phone: "0236 382 8888", email: "lienhe@anhnhien.example",
  description: "Khách sạn bên sông Hàn, ngay trung tâm Đà Nẵng. Không gian nghỉ dưỡng yên tĩnh với nhà hàng, hồ bơi và phòng tập.",
  checkIn: "14:00", checkOut: "12:00", cancellation: "Hủy miễn phí trước 48 giờ so với giờ nhận phòng. Hủy muộn hoặc không đến: thu phí tương đương đêm đầu tiên.",
  rules: "Không hút thuốc trong phòng. Không mang vật nuôi. Giữ yên tĩnh từ 22:00 đến 06:00.",
};

const PartnerHotelInformation = () => {
  const [form, setForm] = useState(initialForm);
  const [selectedAmenities, setSelectedAmenities] = useState(amenities.slice(0, 5));
  const [saved, setSaved] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const toggleAmenity = (item) => setSelectedAmenities((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Thông tin khách sạn</div>
      <h1 className="h3 fw-bold mb-4">Quản lý thông tin khách sạn</h1>
      {saved && <Alert variant="success" dismissible onClose={() => setSaved(false)}>Đã lưu thay đổi thông tin khách sạn.</Alert>}
      <Form onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
        <Section title="Thông tin cơ bản">
          <div className="row g-3">
            <Field className="col-md-8" label="Tên khách sạn" required name="name" value={form.name} onChange={update} />
            <Form.Group className="col-md-4"><Form.Label>Hạng sao chính thức <span className="text-danger">*</span></Form.Label><Form.Select name="stars" value={form.stars} onChange={update}>{[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>{star} sao</option>)}</Form.Select></Form.Group>
            <Field className="col-12" label="Mô tả khách sạn" required as="textarea" rows={3} name="description" value={form.description} onChange={update} />
            <Form.Group className="col-md-6"><Form.Label>Tỉnh / thành phố <span className="text-danger">*</span></Form.Label><Form.Select name="city" value={form.city} onChange={update}><option>Đà Nẵng</option><option>Hà Nội</option><option>Hồ Chí Minh</option></Form.Select></Form.Group>
            <Field className="col-md-6" label="Khu vực" required name="district" value={form.district} onChange={update} />
            <Field className="col-12" label="Địa chỉ hiển thị" required name="address" value={form.address} onChange={update} />
            <Field className="col-md-6" label="Số điện thoại liên hệ" required name="phone" value={form.phone} onChange={update} />
            <Field className="col-md-6" label="Email liên hệ" required type="email" name="email" value={form.email} onChange={update} />
          </div>
        </Section>
        <Section title="Tiện nghi khách sạn" description="Chọn các dịch vụ hiện có tại khách sạn."><div className="row row-cols-2 row-cols-md-4 g-2">{amenities.map((item) => <Form.Check key={item} className="col" label={item} checked={selectedAmenities.includes(item)} onChange={() => toggleAmenity(item)} />)}</div></Section>
        <Section title="Chính sách lưu trú"><div className="row g-3"><Field className="col-md-6" label="Giờ nhận phòng" required type="time" name="checkIn" value={form.checkIn} onChange={update} /><Field className="col-md-6" label="Giờ trả phòng" required type="time" name="checkOut" value={form.checkOut} onChange={update} /><Field className="col-12" label="Chính sách hủy" required as="textarea" rows={3} name="cancellation" value={form.cancellation} onChange={update} /><Field className="col-12" label="Nội quy khách sạn" required as="textarea" rows={3} name="rules" value={form.rules} onChange={update} /></div></Section>
        <Section title="Ảnh & video khách sạn" description="3/20 ảnh · 1 video · Ảnh đầu tiên được dùng làm ảnh bìa."><div className="row g-3 mb-3">{["Mặt tiền khách sạn", "Sảnh đón khách", "Hồ bơi", "Video tổng quan"].map((item) => <div key={item} className="col-6 col-md-3"><div className="bg-light border rounded-3 text-muted d-flex flex-column align-items-center justify-content-center" style={{ height: 116 }}><FaImage className="mb-2" /><small>{item}</small></div><div className="d-flex justify-content-between small mt-2"><span>↔ Di chuyển</span><button className="btn btn-link p-0 text-dark small" type="button">Xóa</button></div></div>)}</div><div className="border border-2 border-dashed rounded-3 p-4 text-center text-muted"><FaUpload className="mb-2" /><div>Kéo thả ảnh hoặc video vào đây hoặc chọn tệp</div><Button type="button" variant="outline-dark" size="sm" className="mt-2">Tải ảnh / video lên</Button><div className="small mt-2">JPG/PNG · Tối đa 5 MB/ảnh · Tối đa 20 ảnh</div></div></Section>
        <div className="d-flex gap-2 pb-4"><Button type="button" variant="outline-secondary">Hủy</Button><Button type="submit" variant="dark"><FaSave className="me-2" />Lưu thay đổi</Button></div>
      </Form>
    </div>
  );
};

const Section = ({ title, description, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-1">{title}</h2>{description && <p className="text-muted small mb-3">{description}</p>}{children}</Card.Body></Card>;
const Field = ({ label, required, className, ...props }) => <Form.Group className={className}><Form.Label>{label} {required && <span className="text-danger">*</span>}</Form.Label><Form.Control required={required} {...props} /></Form.Group>;

export default PartnerHotelInformation;
