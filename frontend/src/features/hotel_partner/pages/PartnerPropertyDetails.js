import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";

const PartnerPropertyDetails = () => {
  const [form, setForm] = useState({
    name: "",
    stars: 4,
    checkIn: "1:00 PM",
    checkOut: "3:00 PM",
    departure: "12:00 AM",
    cancellation: "one",
  });
  const update = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  return (
    <PropertySetupLayout
      step={4}
      title="Thông tin chi tiết cơ sở lưu trú"
      previous="/partner/property-photos"
      next="/partner/property-profile"
    >
      <section className="border-bottom pb-3 mb-3">
        <h2 className="h6 fw-semibold">Tên cơ sở lưu trú</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Đây là tên khách hàng sẽ thấy và sử dụng để xác định cơ sở lưu trú của
          quý đối tác.
        </p>
        <Form.Control
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Tên cơ sở lưu trú"
          maxLength={50}
        />
        <Form.Text>{form.name.length}/50</Form.Text>
      </section>
      <section className="border-bottom pb-3 mb-3">
        <h2 className="h6 fw-semibold">Xếp hạng sao</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Bạn cần trợ giúp?
        </p>
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
      <section className="border-bottom pb-3 mb-3">
        <h2 className="h6 fw-semibold">Thời gian nhận phòng/trả phòng</h2>
        <div className="rounded-3 p-3" style={{ background: "#f5f7fa" }}>
          <p style={{ fontSize: 12 }}>Khi nào khách hàng có thể nhận phòng?</p>
          <div className="row">
            <div className="col">
              <Form.Select
                value={form.checkIn}
                onChange={(e) => update("checkIn", e.target.value)}
              >
                <option>1:00 PM</option>
                <option>2:00 PM</option>
              </Form.Select>
            </div>
            <div className="col">
              <Form.Select
                value={form.checkOut}
                onChange={(e) => update("checkOut", e.target.value)}
              >
                <option>3:00 PM</option>
                <option>4:00 PM</option>
              </Form.Select>
            </div>
          </div>
          <hr />
          <p style={{ fontSize: 12 }}>
            Thời gian nào khách hàng sẽ phải trả phòng?
          </p>
          <Form.Select
            value={form.departure}
            onChange={(e) => update("departure", e.target.value)}
          >
            <option>12:00 AM</option>
            <option>11:00 AM</option>
          </Form.Select>
        </div>
      </section>
      <section>
        <h2 className="h6 fw-semibold">Chính sách hủy</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Chọn một trong số các lựa chọn dưới đây.
        </p>
        {[
          ["one", "Có thể hoàn tiền, tối đa 1 ngày trước ngày nhận phòng"],
          ["three", "Có thể hoàn tiền, tối đa 3 ngày trước ngày nhận phòng"],
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
            style={{ fontSize: 12 }}
          />
        ))}
      </section>
    </PropertySetupLayout>
  );
};
export default PartnerPropertyDetails;
