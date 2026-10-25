import { useContext, useState } from "react";
import { Form } from "react-bootstrap";
import { FaMapMarkerAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { createHotel } from "../partnerApi";
import PropertySetupLayout from "../components/PropertySetupLayout";
import { usePropertyDraft } from "../context/PropertyDraftContext";

const PartnerPropertyPublish = () => {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { draft, clearDraft } = usePropertyDraft();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const publish = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await createHotel(draft, token);
      clearDraft();
      navigate("/partner");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Không thể tạo khách sạn. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PropertySetupLayout
      step={6}
      title="Đăng tải"
      previous="/partner/property-profile"
      nextLabel="Đăng tải"
      disableNext={!accepted}
      onNext={publish}
      isSubmitting={isSubmitting}
    >
      <div
        className="rounded-3 p-3 d-flex align-items-center mb-3"
        style={{ background: "#f5f7fa" }}
      >
        <div
          className="bg-dark rounded-2 me-3"
          style={{ height: 50, width: 50 }}
        />
        <div>
          <strong style={{ fontSize: 13 }}>
            {draft.details.name || "Cơ sở lưu trú của bạn"}
          </strong>
          <p className="mb-0 text-muted" style={{ fontSize: 12 }}>
            <FaMapMarkerAlt className="me-1" />
            {draft.location.district}, {draft.location.provinceCity}
          </p>
        </div>
      </div>
      <hr />
      <h2 className="h6 fw-semibold mt-3">
        Chấp nhận các Điều khoản và Điều kiện
      </h2>
      <Form.Check
        id="terms"
        type="checkbox"
        checked={accepted}
        onChange={(event) => setAccepted(event.target.checked)}
        label={
          <span style={{ fontSize: 12 }}>
            Tôi công nhận rằng mình đã đọc và đồng ý với{" "}
            <a href="/partner/terms">Điều khoản, Điều kiện</a> và Chính sách Bảo
            mật.
          </span>
        }
      />
      {error && (
        <p className="text-danger mt-3 mb-0" role="alert">
          {error}
        </p>
      )}
    </PropertySetupLayout>
  );
};

export default PartnerPropertyPublish;
