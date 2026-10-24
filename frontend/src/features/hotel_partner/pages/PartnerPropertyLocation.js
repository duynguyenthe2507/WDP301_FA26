import { useState } from "react";
import { Form } from "react-bootstrap";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const PartnerPropertyLocation = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(draft.location);
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
      beforeNext={() => updateSection("location", form)}
    >
      <h2 className="h6 fw-semibold mb-3">Vị trí cơ sở lưu trú</h2>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Quốc gia/Vùng</Form.Label>
          <Form.Select name="country" value={form.country} onChange={update}>
            <option>Việt Nam</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Tỉnh/Thành phố</Form.Label>
          <Form.Control
            name="provinceCity"
            value={form.provinceCity}
            onChange={update}
            required
          />
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Quận/Huyện</Form.Label>
          <Form.Control
            name="district"
            value={form.district}
            onChange={update}
            required
          />
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Địa chỉ cụ thể</Form.Label>
          <Form.Control
            name="address"
            value={form.address}
            placeholder="Số nhà, tên đường"
            onChange={update}
            required
          />
        </Form.Group>
        <Form.Group className="mt-3">
          <Form.Label>Mã ZIP/Mã bưu điện</Form.Label>
          <Form.Control name="zipCode" value={form.zipCode} onChange={update} />
        </Form.Group>
      </Form>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyLocation;
