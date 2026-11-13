import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { CANCELLATION_POLICIES } from "../data/hotelOptions";
import { hasErrors, MAX_HOTEL_NAME, validateDetails } from "../data/propertyValidation";

const PartnerPropertyDetails = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(draft.details);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateDetails(form);
  const shown = showErrors ? errors : {};
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    updateSection("details", { [field]: value });
  };
  return (
    <PropertySetupLayout
      step={4}
      title="Thông tin chi tiết cơ sở lưu trú"
      previous="/partner/property-photos"
      next="/partner/property-profile"
      beforeNext={() => updateSection("details", form)}
      invalid={hasErrors(errors)}
      onInvalid={() => setShowErrors(true)}
    >
      <Form.Group className="mb-4">
        <Form.Label>Tên cơ sở lưu trú</Form.Label>
        <Form.Control
          value={form.name}
          maxLength={MAX_HOTEL_NAME}
          isInvalid={!!shown.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <Form.Control.Feedback type="invalid">{shown.name}</Form.Control.Feedback>
        <Form.Text>{form.name.length}/{MAX_HOTEL_NAME}</Form.Text>
      </Form.Group>
      <Form.Group className="mb-4">
        <Form.Label>Mô tả khách sạn</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={form.description}
          placeholder="Giới thiệu ngắn về khách sạn"
          onChange={(e) => update("description", e.target.value)}
        />
      </Form.Group>
      <section className="mb-4">
        <h2 className="h6 fw-semibold">Xếp hạng sao</h2>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            className="btn p-0 me-1"
            onClick={() => update("stars", star)}
          >
            <FaStar
              color={star <= form.stars ? "#c45b00" : "#fff"}
              style={{ stroke: "#c45b00", strokeWidth: 35 }}
            />
          </button>
        ))}
        {shown.stars && <div className="text-danger small mt-1">{shown.stars}</div>}
      </section>
      <section className="mb-4">
        <h2 className="h6 fw-semibold">Giờ nhận và trả phòng</h2>
        <div className="row g-3">
          <Form.Group className="col-md-6">
            <Form.Label>Giờ nhận phòng</Form.Label>
            <Form.Control
              type="time"
              value={form.checkInTime}
              isInvalid={!!shown.checkInTime}
              onChange={(e) => update("checkInTime", e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{shown.checkInTime}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="col-md-6">
            <Form.Label>Giờ trả phòng</Form.Label>
            <Form.Control
              type="time"
              value={form.checkOutTime}
              isInvalid={!!shown.checkOutTime}
              onChange={(e) => update("checkOutTime", e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{shown.checkOutTime}</Form.Control.Feedback>
          </Form.Group>
        </div>
      </section>
      <section>
        <h2 className="h6 fw-semibold">Chính sách hủy</h2>
        {CANCELLATION_POLICIES.map(([value, label]) => (
          <Form.Check
            key={value}
            type="radio"
            name="cancel"
            value={value}
            checked={form.cancellation === value}
            onChange={(e) => update("cancellation", e.target.value)}
            label={label}
            className="mb-3"
          />
        ))}
        {shown.cancellation && <div className="text-danger small">{shown.cancellation}</div>}
      </section>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyDetails;
