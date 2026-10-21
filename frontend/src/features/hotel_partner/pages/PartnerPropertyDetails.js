import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const PartnerPropertyDetails = () => {
  const { draft, updateSection } = usePropertyDraft();
  const [form, setForm] = useState(draft.details);
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
    >
      <Form.Group className="mb-4">
        <Form.Label>Tên cơ sở lưu trú</Form.Label>
        <Form.Control
          value={form.name}
          maxLength={50}
          onChange={(e) => update("name", e.target.value)}
        />
        <Form.Text>{form.name.length}/50</Form.Text>
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
      </section>
      <section>
        <h2 className="h6 fw-semibold">Chính sách hủy</h2>
        {[
          ["one", "Có thể hoàn tiền tối đa 1 ngày trước ngày nhận phòng"],
          ["three", "Có thể hoàn tiền tối đa 3 ngày trước ngày nhận phòng"],
          ["none", "Không hoàn tiền"],
        ].map(([value, label]) => (
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
      </section>
    </PropertySetupLayout>
  );
};

export default PartnerPropertyDetails;
