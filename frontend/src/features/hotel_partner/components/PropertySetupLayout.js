import { useContext, useState } from "react";
import { FaCheck } from "react-icons/fa";
import { Alert, Button } from "react-bootstrap";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { usePropertyDraft } from "../context/PropertyDraftContext";
import { saveHotelRegistrationDraft } from "../partnerApi";

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
  invalid = false,
  onInvalid,
  draftValues,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useContext(AuthContext);
  const { draft, mode } = usePropertyDraft();
  const [blocked, setBlocked] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");

  // Chưa đồng ý điều khoản ở bước đầu thì không vào được các bước sau
  if (!draft.termsAccepted) return <Navigate to="/partner/terms" replace />;

  // Lưu cả dữ liệu đang nhập ở bước hiện tại; bản nháp chưa cần đủ trường bắt buộc nên không kiểm tra
  const saveAndExit = async () => {
    setSavingDraft(true);
    setDraftError("");
    try {
      await saveHotelRegistrationDraft({ ...draft, ...draftValues }, location.pathname, token);
      navigate(mode === "resubmit" ? "/partner/registration-status" : "/");
    } catch (requestError) {
      setDraftError(requestError.response?.data?.message || "Không thể lưu bản nháp. Vui lòng thử lại.");
      setSavingDraft(false);
    }
  };

  const handleNext = () => {
    if (invalid) {
      setBlocked(true);
      onInvalid?.();
      return;
    }
    if (onNext) {
      onNext();
      return;
    }
    beforeNext?.();
    navigate(next);
  };

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
                disabled={savingDraft}
                onClick={saveAndExit}
              >
                {savingDraft ? "Đang lưu..." : "Lưu và thoát"}
              </button>
            </div>
            <h1 className="fs-2 fw-semibold mb-3">{title}</h1>
            {children}
            {draftError && (
              <Alert variant="danger" className="small py-2 mt-3 mb-0" role="alert">
                {draftError}
              </Alert>
            )}
            {blocked && invalid && (
              <Alert variant="danger" className="small py-2 mt-3 mb-0" role="alert">
                Vui lòng kiểm tra lại các trường được đánh dấu.
              </Alert>
            )}
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
            onClick={handleNext}
          >
            {isSubmitting ? "Đang đăng..." : nextLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
};
export default PropertySetupLayout;
