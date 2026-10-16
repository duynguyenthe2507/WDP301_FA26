import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaInfoCircle } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";

const Field = ({ label, value, onChange, select, className = "" }) => (
  <Form.Group className={`mb-3 ${className}`}>
    <Form.Label style={{ fontSize: 12 }}>{label}</Form.Label>
    {select ? (
      <Form.Select value={value} onChange={onChange}>
        <option>{value}</option>
        <option>Việt Nam</option>
      </Form.Select>
    ) : (
      <Form.Control value={value} onChange={onChange} />
    )}
  </Form.Group>
);
const PartnerPropertyProfile = () => {
  const [form, setForm] = useState({
    business: "",
    address: "",
    postcode: "",
    firstName: "",
    lastName: "",
    nationality: "Việt Nam",
    birthday: "03 Nov 2002",
    region: "Hà Nội",
    city: "Hà Nội",
    language: "Tiếng Việt",
    phone: "",
  });
  const update = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));
  return (
    <PropertySetupLayout
      step={5}
      title="Hồ sơ"
      previous="/partner/property-details"
      next="/partner/property-publish"
    >
      <div
        className="rounded-3 p-3 mb-3"
        style={{ background: "#e7f0ff", color: "#0754bd", fontSize: 12 }}
      >
        <FaInfoCircle className="me-2" />
        Để tuân thủ các yêu cầu luật định, chúng tôi cần xác minh tài khoản của
        quý đối tác nhằm tránh gián đoạn dịch vụ.
      </div>
      <section className="border-bottom pb-3 mb-3">
        <h2 className="h6 fw-semibold">Thông tin pháp lý của cơ sở lưu trú</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Vui lòng cung cấp tên pháp lý và địa chỉ của cơ sở lưu trú.
        </p>
        <div className="rounded-3 p-3" style={{ background: "#f5f7fa" }}>
          <Field
            label="Tên pháp lý của cơ sở lưu trú"
            value={form.business}
            onChange={update("business")}
          />
          <Field
            label="Địa chỉ"
            value={form.address}
            onChange={update("address")}
          />
          <div className="row">
            <Field
              className="col-md-6"
              label="Quốc gia"
              value={form.nationality}
              onChange={update("nationality")}
              select
            />
            <Field
              className="col-md-6"
              label="Mã bưu chính"
              value={form.postcode}
              onChange={update("postcode")}
            />
          </div>
        </div>
      </section>
      <section className="border-bottom pb-3 mb-3">
        <h2 className="h6 fw-semibold">Người chủ hưởng lợi lớn nhất</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Vui lòng cung cấp tên của cá nhân nắm quyền cao nhất hoặc sở hữu từ
          20% trở lên.
        </p>
        <div className="rounded-3 p-3" style={{ background: "#f5f7fa" }}>
          <h3 className="h6" style={{ fontSize: 13 }}>
            Thông tin cá nhân
          </h3>
          <div className="row">
            <Field
              className="col-md-6"
              label="Tên"
              value={form.firstName}
              onChange={update("firstName")}
            />
            <Field
              className="col-md-6"
              label="Họ"
              value={form.lastName}
              onChange={update("lastName")}
            />
          </div>
          <Field
            label="Quốc tịch"
            value={form.nationality}
            onChange={update("nationality")}
            select
          />
          <Field
            label="Ngày sinh"
            value={form.birthday}
            onChange={update("birthday")}
            select
          />
          <h3 className="h6" style={{ fontSize: 13 }}>
            Thông tin cư trú <FaInfoCircle size={11} />
          </h3>
          <Field
            label="Quốc gia"
            value={form.nationality}
            onChange={update("nationality")}
            select
          />
          <div className="row">
            <Field
              className="col-md-6"
              label="Bang hoặc Tỉnh"
              value={form.region}
              onChange={update("region")}
              select
            />
            <Field
              className="col-md-6"
              label="Thành phố"
              value={form.city}
              onChange={update("city")}
              select
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className="h6 fw-semibold">Thông tin liên lạc chi tiết</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Agoda sẽ liên hệ với quý đối tác bằng ngôn ngữ yêu thích sau khi hợp
          tác.
        </p>
        <div className="rounded-3 p-3" style={{ background: "#f5f7fa" }}>
          <Field
            label="Ngôn ngữ yêu thích"
            value={form.language}
            onChange={update("language")}
            select
          />
          <div className="row">
            <Field
              className="col-md-5"
              label="Mã quốc gia"
              value="Việt Nam +84"
              onChange={() => {}}
              select
            />
            <Field
              className="col-md-7"
              label="Số điện thoại"
              value={form.phone}
              onChange={update("phone")}
            />
          </div>
        </div>
      </section>
    </PropertySetupLayout>
  );
};
export default PartnerPropertyProfile;
