import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaInfoCircle } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { getCities, getRegions } from "../data/locations";
import { hasErrors, validateProfile } from "../data/propertyValidation";

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
  placeholder,
  disabled,
  error,
}) => (
  <Form.Group className={`mb-3 ${className}`}>
    <Form.Label style={{ fontSize: 12 }}>{label}</Form.Label>
    {select ? (
      <Form.Select value={value} onChange={onChange} disabled={disabled} isInvalid={!!error}>
        {placeholder && <option value="">{placeholder}</option>}
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
      <Form.Control type={type} value={value} onChange={onChange} isInvalid={!!error} />
    )}
    <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
  </Form.Group>
);
const PartnerPropertyProfile = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(draft.profile);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateProfile(form);
  const shown = showErrors ? errors : {};
  const update = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));
  // Đổi cấp trên thì xoá lựa chọn cấp dưới để không giữ giá trị của quốc gia/tỉnh cũ
  const changeResidenceCountry = (event) =>
    setForm((current) => ({
      ...current,
      residenceCountry: event.target.value,
      region: "",
      city: "",
    }));
  const changeRegion = (event) =>
    setForm((current) => ({ ...current, region: event.target.value, city: "" }));
  const regions = getRegions(form.residenceCountry);
  const cities = getCities(form.residenceCountry, form.region);
  return (
    <PropertySetupLayout
      step={5}
      title="Hồ sơ"
      previous="/partner/property-details"
      next="/partner/property-publish"
      beforeNext={() => updateSection("profile", form)}
      invalid={hasErrors(errors)}
      onInvalid={() => setShowErrors(true)}
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
            error={shown.business}
            onChange={update("business")}
          />
          <Field
            label="Địa chỉ"
            value={form.address}
            error={shown.address}
            onChange={update("address")}
          />
          <div className="row">
            <Field
              className="col-md-6"
              label="Quốc gia"
              value={form.country}
              error={shown.country}
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
              error={shown.firstName}
              onChange={update("firstName")}
            />
            <Field
              className="col-md-6"
              label="Họ"
              value={form.lastName}
              error={shown.lastName}
              onChange={update("lastName")}
            />
          </div>
          <Field
            label="Quốc tịch"
            value={form.nationality}
            error={shown.nationality}
            onChange={update("nationality")}
            options={COUNTRIES}
            select
          />
          <Field
            label="Ngày sinh"
            value={form.birthday}
            error={shown.birthday}
            onChange={update("birthday")}
            type="date"
          />
          <h3 className="h6" style={{ fontSize: 13 }}>
            Thông tin cư trú <FaInfoCircle size={11} />
          </h3>
          <Field
            label="Quốc gia"
            value={form.residenceCountry}
            error={shown.residenceCountry}
            onChange={changeResidenceCountry}
            options={COUNTRIES}
            select
          />
          <div className="row">
            <Field
              className="col-md-6"
              label="Bang hoặc Tỉnh"
              value={form.region}
              error={shown.region}
              onChange={changeRegion}
              options={regions}
              placeholder="Chọn bang/tỉnh"
              select
            />
            <Field
              className="col-md-6"
              label="Thành phố"
              value={form.city}
              error={shown.city}
              onChange={update("city")}
              options={cities}
              placeholder="Chọn thành phố"
              disabled={!form.region}
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
            error={shown.language}
            onChange={update("language")}
            options={LANGUAGES}
            select
          />
          <div className="row">
            <Field
              className="col-md-5"
              label="Mã quốc gia"
              value={form.phoneCountryCode}
              error={shown.phoneCountryCode}
              onChange={update("phoneCountryCode")}
              options={PHONE_COUNTRY_CODES}
              select
            />
            <Field
              className="col-md-7"
              label="Số điện thoại"
              value={form.phone}
              error={shown.phone}
              onChange={update("phone")}
            />
          </div>
        </div>
      </section>
    </PropertySetupLayout>
  );
};
export default PartnerPropertyProfile;
