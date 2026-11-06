import { useContext, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { FaImage, FaSave } from "react-icons/fa";
import { AuthContext } from "../../../context/AuthContext";
import ImageUploadButton from "../components/ImageUploadButton";
import { CANCELLATION_POLICIES, HOTEL_AMENITIES } from "../data/hotelOptions";
import { getHotelDetail, updateHotel } from "../partnerApi";

const MAX_IMAGES = 20;
const MAX_IMAGES_PER_UPLOAD = 10;
const CHANGE_FIELD_LABEL = { name: "Tên khách sạn", provinceCity: "Tỉnh / thành phố", address: "Địa chỉ", starRating: "Hạng sao", legalProfile: "Hồ sơ pháp lý" };
const OPEN_REQUEST_STATUSES = ["PENDING", "ADDITIONAL_INFO_REQUIRED"];

const PartnerHotelInformation = () => {
  const { user, token } = useContext(AuthContext);
  // Toàn bộ form lấy từ GET /api/partner/hotel để chỉ có một nguồn dữ liệu
  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(null);
  const [changeRequest, setChangeRequest] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHotelDetail(token)
      .then(({ data }) => { setHotel(data.hotel); setForm(data.hotel); setChangeRequest(data.changeRequest); })
      .catch((requestError) => setLoadError(requestError.response?.data?.message || "Không thể tải thông tin khách sạn."));
  }, [token]);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  // starRating là Number trong model
  const updateStars = (event) => setForm((current) => ({ ...current, starRating: Number(event.target.value) }));
  const toggleAmenity = (item) => setForm((current) => ({ ...current, amenities: current.amenities.includes(item) ? current.amenities.filter((value) => value !== item) : [...current.amenities, item] }));
  // Upload chạy bất đồng bộ nên cập nhật theo state mới nhất
  const addImages = (images) => setForm((current) => ({ ...current, images: [...current.images, ...images] }));
  const removeImage = (index) => setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }));
  const moveImage = (index, offset) => setForm((current) => {
    const images = [...current.images];
    [images[index], images[index + offset]] = [images[index + offset], images[index]];
    return { ...current, images };
  });
  const reset = () => { setForm(hotel); setSaveError(""); setSavedMessage(""); };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSavedMessage("");
    try {
      const { data } = await updateHotel(form, token);
      setHotel(data.hotel);
      setForm(data.hotel);
      setChangeRequest(data.changeRequest);
      setSavedMessage(data.message);
    } catch (requestError) {
      setSaveError(requestError.response?.data?.message || "Không thể lưu thông tin khách sạn.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return loadError ? <Alert variant="danger">{loadError}</Alert> : <div className="text-center p-5"><Spinner /></div>;
  }

  // Số điện thoại lấy từ hồ sơ pháp lý, email lấy từ tài khoản; cả hai chỉ đọc ở màn này
  const contact = form.legalProfile?.contact;
  const contactPhone = [contact?.countryCode, contact?.phone].filter(Boolean).join(" ");
  // Đang có yêu cầu chờ duyệt thì khóa các trường nhạy cảm vì chỉ được gửi một yêu cầu mỗi lần
  const requestOpen = OPEN_REQUEST_STATUSES.includes(changeRequest?.status);
  const amenityOptions = [...HOTEL_AMENITIES.map(([item]) => item), ...form.amenities.filter((item) => !HOTEL_AMENITIES.some(([option]) => option === item))];

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Thông tin khách sạn</div>
      <h1 className="h3 fw-bold mb-4">Quản lý thông tin khách sạn</h1>
      {requestOpen && <Alert variant="warning"><strong>{changeRequest.status === "PENDING" ? "Đang chờ quản lý vận hành phê duyệt" : "Quản lý vận hành yêu cầu bổ sung thông tin"}</strong><ul className="mb-0 mt-1">{changeRequest.changes.map((change) => <li key={change.field}>{CHANGE_FIELD_LABEL[change.field] || change.field}: {typeof change.proposedValue === "object" ? "đã cập nhật" : String(change.proposedValue)}</li>)}</ul>{changeRequest.decisionNote && <div className="mt-1">Ghi chú: {changeRequest.decisionNote}</div>}</Alert>}
      {changeRequest?.status === "REJECTED" && <Alert variant="danger"><strong>Yêu cầu thay đổi gần nhất đã bị từ chối.</strong>{changeRequest.decisionNote && ` Lý do: ${changeRequest.decisionNote}`}</Alert>}
      <Form onSubmit={submit}>
        <Section title="Thông tin cơ bản" description="Tên, hạng sao, tỉnh / thành phố và địa chỉ cần quản lý vận hành phê duyệt trước khi áp dụng.">
          <div className="row g-3">
            <Field className="col-md-8" label="Tên khách sạn" required disabled={requestOpen} name="name" value={form.name} onChange={update} />
            <Form.Group className="col-md-4"><Form.Label>Hạng sao chính thức <span className="text-danger">*</span></Form.Label><Form.Select disabled={requestOpen} name="starRating" value={form.starRating} onChange={updateStars}>{[1, 2, 3, 4, 5].map((star) => <option key={star} value={star}>{star} sao</option>)}</Form.Select></Form.Group>
            <Field className="col-12" label="Mô tả khách sạn" required as="textarea" rows={3} name="description" value={form.description} onChange={update} />
            <Field className="col-md-6" label="Tỉnh / thành phố" required disabled={requestOpen} name="provinceCity" value={form.provinceCity} onChange={update} />
            <Field className="col-md-6" label="Địa chỉ" required disabled={requestOpen} name="address" value={form.address} onChange={update} />
            <Field className="col-md-6" label="Số điện thoại liên hệ" value={contactPhone} readOnly />
            <Field className="col-md-6" label="Email liên hệ" type="email" value={user?.email || ""} readOnly />
          </div>
        </Section>
        <Section title="Tiện nghi khách sạn" description="Chọn các dịch vụ hiện có tại khách sạn."><div className="row row-cols-2 row-cols-md-4 g-2">{amenityOptions.map((item) => <Form.Check key={item} id={`amenity-${item}`} className="col" label={item} checked={form.amenities.includes(item)} onChange={() => toggleAmenity(item)} />)}</div></Section>
        <Section title="Chính sách lưu trú" description="Chính sách hủy mới chỉ áp dụng cho đặt phòng phát sinh sau khi lưu."><div className="row g-3"><Field className="col-md-6" label="Giờ nhận phòng" required type="time" name="checkInTime" value={form.checkInTime} onChange={update} /><Field className="col-md-6" label="Giờ trả phòng" required type="time" name="checkOutTime" value={form.checkOutTime} onChange={update} /><Form.Group className="col-12"><Form.Label>Chính sách hủy <span className="text-danger">*</span></Form.Label><Form.Select name="cancellationPolicy" value={form.cancellationPolicy} onChange={update}>{CANCELLATION_POLICIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group></div></Section>
        <Section title="Ảnh khách sạn" description={`${form.images.length}/${MAX_IMAGES} ảnh · Ảnh đầu tiên được dùng làm ảnh bìa.`}><div className="row g-3 mb-3">{form.images.length ? form.images.map((image, index) => <div key={image.url} className="col-6 col-md-3"><img src={image.url} alt="" className="w-100 border rounded-3" style={{ height: 116, objectFit: "cover" }} /><div className="d-flex justify-content-between small mt-2"><span><button className="btn btn-link p-0 text-dark small me-2 text-decoration-none" type="button" aria-label="Chuyển ảnh lên trước" disabled={index === 0} onClick={() => moveImage(index, -1)}>←</button><button className="btn btn-link p-0 text-dark small text-decoration-none" type="button" aria-label="Chuyển ảnh ra sau" disabled={index === form.images.length - 1} onClick={() => moveImage(index, 1)}>→</button></span><button className="btn btn-link p-0 text-dark small" type="button" onClick={() => removeImage(index)}>Xóa</button></div></div>) : <div className="col-12"><div className="bg-light border rounded-3 text-muted d-flex flex-column align-items-center justify-content-center" style={{ height: 116 }}><FaImage className="mb-2" /><small>Chưa có ảnh</small></div></div>}</div><div className="border border-2 border-dashed rounded-3 p-4 text-center text-muted"><ImageUploadButton type="hotel" maxFiles={Math.min(MAX_IMAGES - form.images.length, MAX_IMAGES_PER_UPLOAD)} onUploaded={addImages} /><div className="small mt-2">JPG/PNG/WEBP/GIF · Tối đa 5 MB/ảnh · Tối đa {MAX_IMAGES} ảnh · Ảnh được lưu khi bấm "Lưu thay đổi"</div></div></Section>
        {saveError && <Alert variant="danger" dismissible onClose={() => setSaveError("")}>{saveError}</Alert>}
        {savedMessage && <Alert variant="success" dismissible onClose={() => setSavedMessage("")}>{savedMessage}</Alert>}
        <div className="d-flex gap-2 pb-4"><Button type="button" variant="outline-secondary" disabled={saving} onClick={reset}>Hủy</Button><Button type="submit" variant="dark" disabled={saving}>{saving ? <Spinner size="sm" className="me-2" /> : <FaSave className="me-2" />}Lưu thay đổi</Button></div>
      </Form>
    </div>
  );
};

const Section = ({ title, description, children }) => <Card className="border-0 shadow-sm rounded-4 mb-3"><Card.Body className="p-3 p-md-4"><h2 className="h6 fw-bold mb-1">{title}</h2>{description && <p className="text-muted small mb-3">{description}</p>}{children}</Card.Body></Card>;
const Field = ({ label, required, className, ...props }) => <Form.Group className={className}><Form.Label>{label} {required && <span className="text-danger">*</span>}</Form.Label><Form.Control required={required} {...props} /></Form.Group>;

export default PartnerHotelInformation;
