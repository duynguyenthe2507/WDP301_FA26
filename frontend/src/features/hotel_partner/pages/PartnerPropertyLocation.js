import { useState } from "react";
import { Form } from "react-bootstrap";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { hasErrors, validateLocation } from "../data/propertyValidation";

const PartnerPropertyLocation = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(draft.location);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateLocation(form);
  const shown = showErrors ? errors : {};
  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    updateSection("location", { [name]: value });
  };

  return (
    <PropertySetupLayout
      step={0}
      title="Vị trí"
      previous="/partner/terms"
      next="/partner/property-amenities"
      draftValues={{ location: form }}
      invalid={hasErrors(errors)}
      onInvalid={() => setShowErrors(true)}
    >
      <h2 className="h6 fw-semibold mb-3">Vị trí cơ sở lưu trú</h2>
      <Form noValidate>
        <Form.Group>
          <Form.Label>Tỉnh/Thành phố</Form.Label>
          <Form.Control
            name="provinceCity"
            value={form.provinceCity}
            onChange={update}
            isInvalid={!!shown.provinceCity}
          />
          <Form.Control.Feedback type="invalid">{shown.provinceCity}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Quận/Huyện</Form.Label>
          <Form.Control
            name="district"
            value={form.district}
            onChange={update}
            isInvalid={!!shown.district}
          />
          <Form.Control.Feedback type="invalid">{shown.district}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Địa chỉ cụ thể</Form.Label>
          <Form.Control
            name="address"
            value={form.address}
            placeholder="Số nhà, tên đường"
            onChange={update}
            isInvalid={!!shown.address}
          />
          <Form.Control.Feedback type="invalid">{shown.address}</Form.Control.Feedback>
        </Form.Group>
      </Form>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyLocation;
