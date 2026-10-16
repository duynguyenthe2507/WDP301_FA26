import { useState } from "react";
import { Form } from "react-bootstrap";
import { FaMapMarkerAlt } from "react-icons/fa";
import PropertySetupLayout from "../components/PropertySetupLayout";

const PartnerPropertyPublish = () => {
  const [accepted, setAccepted] = useState(false);
  return (
    <PropertySetupLayout
      step={6}
      title="Đăng tải"
      previous="/partner/property-profile"
      next="/partner"
      nextLabel="Đăng tải"
      disableNext={!accepted}
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
          <strong style={{ fontSize: 13 }}>Cơ sở lưu trú của bạn</strong>
          <p className="mb-0 text-muted" style={{ fontSize: 12 }}>
            <FaMapMarkerAlt className="me-1" />
            Hà Nội, Hà Nội
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
            <a href="/partner/terms">Điều khoản và Điều kiện</a> và{" "}
            <a href="/partner/terms">Chính sách Bảo mật</a> của Agoda.
          </span>
        }
      />
      <p className="text-muted mt-4" style={{ fontSize: 11 }}>
        Xin lưu ý, theo Đạo luật Dịch vụ số, trang thông tin cơ sở lưu trú của
        quý đối tác sẽ không được hiển thị cho khách hàng ở EEA cho đến khi yêu
        cầu DSA được xác thực.
      </p>
    </PropertySetupLayout>
  );
};
export default PartnerPropertyPublish;
