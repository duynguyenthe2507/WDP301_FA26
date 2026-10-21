import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaInfoCircle } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const COUNTRIES = [
  "Việt Nam",
  "Thái Lan",
  "Singapore",
  "Nhật Bản",
  "Hàn Quốc",
  "Trung Quốc",
  "Hoa Kỳ",
  "Úc",
  "Anh",
  "Pháp",
  "Đức",
];

const PHONE_COUNTRY_CODES = [
  { value: "+84", label: "Việt Nam (+84)" },
  { value: "+66", label: "Thái Lan (+66)" },
  { value: "+65", label: "Singapore (+65)" },
  { value: "+81", label: "Nhật Bản (+81)" },
  { value: "+82", label: "Hàn Quốc (+82)" },
  { value: "+86", label: "Trung Quốc (+86)" },
  { value: "+1", label: "Hoa Kỳ (+1)" },
  { value: "+61", label: "Úc (+61)" },
  { value: "+44", label: "Anh (+44)" },
  { value: "+33", label: "Pháp (+33)" },
  { value: "+49", label: "Đức (+49)" },
];

const LANGUAGES = ["Tiếng Việt", "English", "日本語", "한국어", "中文"];

const Field = ({
  label,
  value,
  onChange,
  select,
  options = [],
  type = "text",
  className = "",
}) => (
  <Form.Group className={`mb-3 ${className}`}>
    <Form.Label style={{ fontSize: 12 }}>{label}</Form.Label>
    {select ? (
      <Form.Select value={value} onChange={onChange}>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;

          return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
          );
        })}
      </Form.Select>
    ) : (
      <Form.Control type={type} value={value} onChange={onChange} />
    )}
  </Form.Group>
);
const PartnerPropertyProfile = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(
    draft.profile || {
      business: "",
      address: "",
      postcode: "",
      country: "Việt Nam",
      firstName: "",
      lastName: "",
      nationality: "Việt Nam",
      birthday: "",
      residenceCountry: "Việt Nam",
      region: "Hà Nội",
      city: "Hà Nội",
      language: "Tiếng Việt",
      phoneCountryCode: "+84",
      phone: "",
    },
  );
  const update = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));
  return (
    <PropertySetupLayout
      step={5}
      title="Hồ sơ"
      previous="/partner/property-details"
      next="/partner/property-publish"
      beforeNext={() => updateSection("profile", form)}
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
              value={form.country}
              onChange={update("country")}
              options={COUNTRIES}
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
            options={COUNTRIES}
            select
          />
          <Field
            label="Ngày sinh"
            value={form.birthday}
            onChange={update("birthday")}
            type="date"
          />
          <h3 className="h6" style={{ fontSize: 13 }}>
            Thông tin cư trú <FaInfoCircle size={11} />
          </h3>
          <Field
            label="Quốc gia"
            value={form.residenceCountry}
            onChange={update("residenceCountry")}
            options={COUNTRIES}
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
            options={LANGUAGES}
            select
          />
          <div className="row">
            <Field
              className="col-md-5"
              label="Mã quốc gia"
              value={form.phoneCountryCode}
              onChange={update("phoneCountryCode")}
              options={PHONE_COUNTRY_CODES}
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
