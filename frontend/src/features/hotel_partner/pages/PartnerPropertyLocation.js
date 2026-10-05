import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { FaCheck, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const steps = [
  "Vị trí",
  "Tiện nghi",
  "Phòng",
  "Định giá",
  "Ảnh",
  "Chi tiết",
  "Hồ sơ",
  "Đăng",
];

const PartnerPropertyLocation = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    country: "Việt Nam",
    province: "Hà Nội",
    city: "Hà Nội",
    address: "",
    propertyName: "",
    zipCode: "",
  });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="bg-white" style={{ minHeight: "100%" }}>
      <div className="border-bottom" />
      <div className="container py-4 py-lg-5" style={{ maxWidth: "1120px" }}>
        <div className="row gx-4 gx-lg-5">
          <aside className="col-lg-3 mb-4 mb-lg-0">
            <ol className="list-unstyled mb-0">
              {steps.map((step, index) => {
                const active = index === 0;
                const currentStep = 0;
                const complete = index < currentStep;

                return (
                  <li
                    key={step}
                    className="d-flex position-relative pb-3"
                    style={{ minHeight: "45px" }}
                  >
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="position-absolute"
                        style={{
                          background: index < currentStep ? "#2563eb" : "#e2e8f0",
                          height: "24px",
                          left: "8px",
                          top: "18px",
                          width: "2px",
                        }}
                      />
                    )}
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 me-2"
                      style={{
                        background: active || complete ? "#2563eb" : "#f1f5f9",
                        color: active || complete ? "#fff" : "#64748b",
                        fontSize: "10px",
                        height: "17px",
                        width: "17px",
                        zIndex: 1,
                      }}
                    >
                      {complete ? <FaCheck size={8} /> : index + 1}
                    </span>
                    <span
                      className={
                        active ? "text-primary fw-semibold" : "text-secondary"
                      }
                      style={{ fontSize: "13px", lineHeight: "17px" }}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>

          <main className="col-lg-7">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted" style={{ fontSize: "12px" }}>
                Bước 1/8
              </span>
              <button
                type="button"
                className="btn btn-link p-0 text-primary text-decoration-none"
                style={{ fontSize: "12px" }}
                onClick={() => navigate("/partner")}
              >
                Lưu và thoát
              </button>
            </div>
            <h1
              className="fs-2 fw-semibold mb-3"
              style={{ fontFamily: "inherit" }}
            >
              Vị trí
            </h1>

            {/* <div className="d-flex align-items-center rounded-pill px-3 mb-3" style={{ background: '#eff4fc', height: '35px' }}>
              <FaSearch className="text-secondary me-2" size={14} />
              <span className="text-muted" style={{ fontSize: '12px' }}>Tìm vị trí của cơ sở lưu trú</span>
            </div> */}

            <h2 className="h6 fw-semibold mb-3">Vị trí cơ sở lưu trú</h2>
            <Form>
              <Form.Group className="mb-3 position-relative">
                <Form.Label
                  className="position-absolute bg-white px-1 text-muted"
                  style={{
                    fontSize: "10px",
                    left: "9px",
                    top: "-8px",
                    zIndex: 1,
                  }}
                >
                  Quốc gia/Vùng
                </Form.Label>
                <Form.Select
                  name="country"
                  value={form.country}
                  onChange={updateField}
                  className="py-2"
                  style={{ fontSize: "13px" }}
                >
                  <option>Việt Nam</option>
                </Form.Select>
              </Form.Group>

              <div className="row g-2">
                <div className="col-md-6">
                  <Form.Group className="mb-3 position-relative">
                    <Form.Label
                      className="position-absolute bg-white px-1 text-muted"
                      style={{
                        fontSize: "10px",
                        left: "9px",
                        top: "-8px",
                        zIndex: 1,
                      }}
                    >
                      Bang/Tỉnh
                    </Form.Label>
                    <Form.Select
                      name="province"
                      value={form.province}
                      onChange={updateField}
                      className="py-2"
                      style={{ fontSize: "13px" }}
                    >
                      <option>Hà Nội</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3 position-relative">
                    <Form.Label
                      className="position-absolute bg-white px-1 text-muted"
                      style={{
                        fontSize: "10px",
                        left: "9px",
                        top: "-8px",
                        zIndex: 1,
                      }}
                    >
                      Thành phố
                    </Form.Label>
                    <Form.Select
                      name="city"
                      value={form.city}
                      onChange={updateField}
                      className="py-2"
                      style={{ fontSize: "13px" }}
                    >
                      <option>Hà Nội</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3 position-relative">
                <Form.Label
                  className="position-absolute bg-white px-1 text-muted"
                  style={{
                    fontSize: "10px",
                    left: "9px",
                    top: "-8px",
                    zIndex: 1,
                  }}
                >
                  Địa chỉ đường phố bằng tiếng Anh
                </Form.Label>
                <Form.Control
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  placeholder="ABC"
                  className="py-2"
                  style={{ fontSize: "13px" }}
                />
              </Form.Group>
              <Form.Control
                name="propertyName"
                value={form.propertyName}
                onChange={updateField}
                placeholder="Tên tòa nhà, tầng hoặc số căn hộ (không bắt buộc)"
                className="py-2 mb-3"
                style={{ fontSize: "13px" }}
              />
              <Form.Control
                name="zipCode"
                value={form.zipCode}
                onChange={updateField}
                placeholder="Mã ZIP/Mã bưu điện (không bắt buộc)"
                className="py-2"
                style={{ fontSize: "13px" }}
              />
            </Form>

            {/* Google Map is intentionally omitted until map integration is ready. */}
          </main>
        </div>
      </div>

      <footer className="border-top bg-white py-2 sticky-bottom">
        <div
          className="container d-flex justify-content-between"
          style={{
            maxWidth: "1120px",
            paddingLeft: "calc(var(--bs-gutter-x) * .5 + 25%)",
          }}
        >
          <Button
            variant="outline-primary"
            className="rounded-pill px-4"
            size="sm"
            onClick={() => navigate("/partner")}
          >
            Quay trở lại
          </Button>
          <Button
            className="rounded-pill px-4"
            size="sm"
            onClick={() => console.info("Location saved", form)}
          >
            Tiếp theo
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PartnerPropertyLocation;
