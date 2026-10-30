import { useContext, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { FaImage, FaSave, FaUpload } from "react-icons/fa";
import { AuthContext } from "../../../context/AuthContext";
import { CANCELLATION_POLICIES, HOTEL_AMENITIES } from "../data/hotelOptions";
import { getHotelDetail } from "../partnerApi";

const PartnerHotelInformation = () => {
  const { user, token } = useContext(AuthContext);
  // Toàn bộ form lấy từ GET /api/partner/hotel để chỉ có một nguồn dữ liệu
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getHotelDetail(token)
      .then(({ data }) => setForm(data.hotel))
      .catch((requestError) => setError(requestError.response?.data?.message || "Không thể tải thông tin khách sạn."));
  }, [token]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  // starRating là Number trong model
  const updateStars = (event) => setForm((current) => ({ ...current, starRating: Number(event.target.value) }));
  const toggleAmenity = (item) => setForm((current) => ({ ...current, amenities: current.amenities.includes(item) ? current.amenities.filter((value) => value !== item) : [...current.amenities, item] }));
  // Số điện thoại lấy từ hồ sơ pháp lý, email lấy từ tài khoản; cả hai chỉ đọc ở màn này
  const contact = form?.legalProfile?.contact;
  const contactPhone = [contact?.countryCode, contact?.phone].filter(Boolean).join(" ");

  if (!form) {
    return error ? <Alert variant="danger">{error}</Alert> : <div className="text-center p-5"><Spinner /></div>;
  }

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Thông tin khách sạn</div>
      <h1 className="h3 fw-bold mb-4">Quản lý thông tin khách sạn</h1>
      {saved && <Alert variant="success" dismissible onClose={() => setSaved(false)}>Đã lưu thay đổi thông tin khách sạn.</Alert>}
      <Form onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
        <Section title="Thông tin cơ bản">
          <div className="row g-3">
            <Field className="col-md-8" label="Tên khách sạn" required name="name" value={form.name} onChange={update} />
            <Form.Group className="col-md-4"><Form.Label>Hạng sao chính thức <span className="text-danger">*</span></Form.Label><Form.Select name="starRating" value={form.starRating} onChange={updateStars}>{[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>{star} sao</option>)}</Form.Select></Form.Group>
            <Field className="col-12" label="Mô tả khách sạn" required as="textarea" rows={3} name="description" value={form.description} onChange={update} />
            <Field className="col-md-6" label="Tỉnh / thành phố" required name="provinceCity" value={form.provinceCity} onChange={update} />
            <Field className="col-md-6" label="Địa chỉ" required name="address" value={form.address} onChange={update} />
            <Field className="col-md-6" label="Số điện thoại liên hệ" value={contactPhone} readOnly />
            <Field className="col-md-6" label="Email liên hệ" type="email" value={user?.email || ""} readOnly />
          </div>
        </Section>
        <Section title="Tiện nghi khách sạn" description="Chọn các dịch vụ hiện có tại khách sạn."><div className="row row-cols-2 row-cols-md-4 g-2">{HOTEL_AMENITIES.map(([item]) => <Form.Check key={item} id={`amenity-${item}`} className="col" label={item} checked={form.amenities.includes(item)} onChange={() => toggleAmenity(item)} />)}</div></Section>
        <Section title="Chính sách lưu trú"><div className="row g-3"><Field className="col-md-6" label="Giờ nhận phòng" required type="time" name="checkInTime" value={form.checkInTime} onChange={update} /><Field className="col-md-6" label="Giờ trả phòng" required type="time" name="checkOutTime" value={form.checkOutTime} onChange={update} /><Form.Group className="col-12"><Form.Label>Chính sách hủy <span className="text-danger">*</span></Form.Label><Form.Select name="cancellationPolicy" value={form.cancellationPolicy} onChange={update}>{CANCELLATION_POLICIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group></div></Section>
        <Section title="Ảnh & video khách sạn" description={`${form.images.length}/20 ảnh · Ảnh đầu tiên được dùng làm ảnh bìa.`}><div className="row g-3 mb-3">{form.images.length ? form.images.map((image) => <div key={image.url} className="col-6 col-md-3"><img src={image.url} alt="" className="w-100 border rounded-3" style={{ height: 116, objectFit: "cover" }} /><div className="d-flex justify-content-between small mt-2"><span>↔ Di chuyển</span><button className="btn btn-link p-0 text-dark small" type="button">Xóa</button></div></div>) : <div className="col-12"><div className="bg-light border rounded-3 text-muted d-flex flex-column align-items-center justify-content-center" style={{ height: 116 }}><FaImage className="mb-2" /><small>Chưa có ảnh</small></div></div>}</div><div className="border border-2 border-dashed rounded-3 p-4 text-center text-muted"><FaUpload className="mb-2" /><div>Kéo thả ảnh hoặc video vào đây hoặc chọn tệp</div><Button type="button" variant="outline-dark" size="sm" className="mt-2">Tải ảnh / video lên</Button><div className="small mt-2">JPG/PNG · Tối đa 5 MB/ảnh · Tối đa 20 ảnh</div></div></Section>
        <div className="d-flex gap-2 pb-4"><Button type="button" variant="outline-secondary">Hủy</Button><Button type="submit" variant="dark"><FaSave className="me-2" />Lưu thay đổi</Button></div>
      </Form>
    </div>
  );
};

const Section = ({ title, description, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-1">{title}</h2>{description && <p className="text-muted small mb-3">{description}</p>}{children}</Card.Body></Card>;
const Field = ({ label, required, className, ...props }) => <Form.Group className={className}><Form.Label>{label} {required && <span className="text-danger">*</span>}</Form.Label><Form.Control required={required} {...props} /></Form.Group>;

export default PartnerHotelInformation;
