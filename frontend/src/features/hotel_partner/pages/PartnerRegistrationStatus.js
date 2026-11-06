import { Alert, Button, Card } from "react-bootstrap";
import { Link, useOutletContext } from "react-router-dom";

const MESSAGES = {
  PENDING: { variant: "warning", text: "Hồ sơ đang chờ Operations Manager xét duyệt." },
  REJECTED: { variant: "danger", text: "Hồ sơ đã bị từ chối." },
  ACTIVE: { variant: "success", text: "Khách sạn đã được duyệt." },
};

const PartnerRegistrationStatus = () => {
  const { hotel, verification } = useOutletContext();
  const needsInfo = verification?.status === "ADDITIONAL_INFO_REQUIRED";
  const message = needsInfo
    ? { variant: "info", text: "Operations Manager yêu cầu bổ sung thông tin." }
    : MESSAGES[hotel.status];

  return (
    <Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4">
      <h2 className="h5 fw-bold mb-3">Trạng thái hồ sơ đăng ký</h2>
      <p className="mb-1"><strong>{hotel.name}</strong></p>
      <p className="text-muted small">
        Mã hồ sơ: {verification?._id} · Ngày gửi: {new Date(hotel.createdAt).toLocaleDateString("vi-VN")}
      </p>
      <Alert variant={message.variant}>{message.text}</Alert>
      {verification?.reviewNote && <p><strong>Ghi chú của quản lý:</strong> {verification.reviewNote}</p>}
      {hotel.status === "ACTIVE" && <Button as={Link} to="/partner">Vào trang quản lý</Button>}
    </Card.Body></Card>
  );
};

export default PartnerRegistrationStatus;