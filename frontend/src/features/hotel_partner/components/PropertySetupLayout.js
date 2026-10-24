import { FaCheck } from "react-icons/fa";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export const propertySteps = [
  "Vị trí",
  "Tiện nghi",
  "Phòng",
  "Ảnh",
  "Chi tiết",
  "Hồ sơ",
  "Đăng",
];

const PropertySetupLayout = ({
  step,
  title,
  children,
  previous,
  next,
  nextLabel = "Tiếp theo",
  disableNext = false,
  beforeNext,
  onNext,
  isSubmitting = false,
}) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-white d-flex flex-column"
      style={{ minHeight: "calc(100vh - 72px)" }}
    >
      <div
        className="container flex-grow-1 py-4 py-lg-5"
        style={{ maxWidth: 1120 }}
      >
        <div className="row gx-4 gx-lg-5">
          <aside className="col-lg-3 mb-4 mb-lg-0">
            <ol className="list-unstyled mb-0">
              {propertySteps.map((label, index) => {
                const complete = index < step;
                const active = index === step;
                return (
                  <li
                    className="d-flex position-relative pb-3"
                    key={label}
                    style={{ minHeight: 45 }}
                  >
                    {index < propertySteps.length - 1 && (
                      <span
                        className="position-absolute"
                        style={{
                          background: complete ? "#2563eb" : "#e2e8f0",
                          height: 24,
                          width: 2,
                          left: 8,
                          top: 18,
                        }}
                      />
                    )}
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 me-2"
                      style={{
                        background: active || complete ? "#2563eb" : "#f1f5f9",
                        color: active || complete ? "#fff" : "#64748b",
                        fontSize: 10,
                        height: 17,
                        width: 17,
                        zIndex: 1,
                      }}
                    >
                      {complete ? <FaCheck size={8} /> : index + 1}
                    </span>
                    <span
                      className={
                        active ? "text-primary fw-semibold" : "text-secondary"
                      }
                      style={{ fontSize: 13, lineHeight: "17px" }}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>
          <main className="col-lg-7">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="text-muted" style={{ fontSize: 12 }}>
                Bước {step + 1}/7
              </span>
              <button
                type="button"
                className="btn btn-link p-0 text-primary text-decoration-none"
                style={{ fontSize: 12 }}
                onClick={() => navigate("/partner")}
              >
                Lưu và thoát
              </button>
            </div>
            <h1 className="fs-2 fw-semibold mb-3">{title}</h1>
            {children}
          </main>
        </div>
      </div>
      <footer className="border-top bg-white py-2 sticky-bottom">
        <div
          className="container d-flex justify-content-between"
          style={{
            maxWidth: 1120,
            paddingLeft: "calc(var(--bs-gutter-x) * .5 + 25%)",
          }}
        >
          <Button
            variant="outline-primary"
            className="rounded-pill px-4"
            size="sm"
            onClick={() => navigate(previous)}
          >
            Quay trở lại
          </Button>
          <Button
            className="rounded-pill px-4"
            size="sm"
            disabled={disableNext || isSubmitting}
            onClick={
              onNext ||
              (() => {
                beforeNext?.();
                navigate(next);
              })
            }
          >
            {isSubmitting ? "Đang đăng..." : nextLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
};
export default PropertySetupLayout;
