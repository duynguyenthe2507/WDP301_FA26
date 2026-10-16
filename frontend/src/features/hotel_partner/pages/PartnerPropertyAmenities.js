import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import {
  FaCheck,
  FaDumbbell,
  FaSmokingBan,
  FaSnowflake,
  FaUtensils,
  FaWifi,
  FaPaw,
  FaSpa,
  FaCarSide,
  FaShuttleVan,
  FaConciergeBell,
  FaGlassMartiniAlt,
  FaInfoCircle,
  FaSwimmingPool,
} from "react-icons/fa";

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
const propertySetupSteps = ["Vị trí", "Tiện nghi", "Phòng", "Ảnh", "Chi tiết", "Hồ sơ", "Đăng"];
void steps;
const amenities = [
  { name: "Bể bơi", icon: FaSwimmingPool },
  { name: "Bãi đỗ xe", icon: FaCarSide},
  { name: "Spa", icon: FaSpa},
  { name: "Xông khô", icon: FaSpa },
  { name: "Không hút thuốc", icon: FaSmokingBan },
  { name: "Wi-Fi [miễn phí]", icon: FaWifi },
  { name: "Đưa đón sân bay", icon: FaShuttleVan },
  { name: "Được phép đưa thú nuôi vào", icon: FaPaw },
  { name: "Phòng tập", icon: FaDumbbell },
  { name: "Khu vực hút thuốc", icon: FaSmokingBan },
  { name: "Bàn tiếp tân [24 giờ]", icon: FaConciergeBell },
  { name: "Máy điều hòa", icon: FaSnowflake },
  { name: "Nhà hàng", icon: FaUtensils },
  { name: "Câu lạc bộ đêm", icon: FaGlassMartiniAlt },
  { name: "Tiện nghi cho khách khuyết tật", icon: FaPaw },
];

const PartnerPropertyAmenities = () => {
  const navigate = useNavigate();
  const [selectedAmenities, setSelectedAmenities] = useState(
    amenities
      .filter((amenity) => amenity.selected)
      .map((amenity) => amenity.name),
  );

  const toggleAmenity = (name) => {
    setSelectedAmenities((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  return (
    <div className="bg-white d-flex flex-column" style={{ minHeight: "100vh" }}>
      <div
        className="container flex-grow-1 py-4 py-lg-5"
        style={{ maxWidth: "1120px" }}
      >
        <div className="row gx-4 gx-lg-5">
          <aside className="col-lg-3 mb-4 mb-lg-0">
            <ol className="list-unstyled mb-0">
              {propertySetupSteps.map((step, index) => {
                const active = index === 1;
                const complete = index < 1;
                return (
                  <li
                    key={step}
                    className="d-flex position-relative pb-3"
                    style={{ minHeight: "45px" }}
                  >
                    {index < propertySetupSteps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="position-absolute"
                        style={{
                          background: index < 1 ? "#2563eb" : "#e2e8f0",
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
                Bước 2/8
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
            <h1 className="fs-2 fw-semibold mb-3">Tiện nghi</h1>
            <h2 className="h6 fw-semibold mb-1">Những điều khách yêu thích</h2>
            <p className="text-muted mb-3" style={{ fontSize: "12px" }}>
              Du khách ưu tiên các tiện nghi này khi đặt phòng lưu trú
            </p>

            <div className="row g-2">
              {amenities.map(({ name, icon: Icon }) => {
                const selected = selectedAmenities.includes(name);
                return (
                  <div className="col-6 col-md-3" key={name}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleAmenity(name)}
                      className="w-100 text-start rounded-3 p-3"
                      style={{
                        background: "#fff",
                        border: `1px solid ${selected ? "#0d6efd" : "#ced4da"}`,
                        color: selected ? "#0d6efd" : "#212529",
                        fontSize: "12px",
                        height: "82px",
                      }}
                    >
                      <Icon size={17} className="d-block mb-2" />
                      <span className="d-block" style={{ lineHeight: "14px" }}>
                        {name}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              className="d-flex align-items-start rounded-3 mt-3 p-3"
              style={{
                background: "#e7f0ff",
                color: "#0b57c8",
                fontSize: "12px",
                lineHeight: "15px",
              }}
            >
              <FaInfoCircle className="flex-shrink-0 me-2 mt-1" />
              <span>
                Những cơ sở lưu trú có nhiều tiện nghi hơn thường nhận được
                nhiều lượt xem hơn. Quý đối tác có thể thông tin về cơ sở vật
                chất vào trang thông tin của mình sau khi trang hoạt động.
              </span>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-top bg-white py-2">
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
            onClick={() => navigate("/partner/property-location")}
          >
            Quay trở lại
          </Button>
          <Button
            className="rounded-pill px-4"
            size="sm"
            onClick={() => navigate("/partner/property-rooms")}
          >
            Tiếp theo
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PartnerPropertyAmenities;
