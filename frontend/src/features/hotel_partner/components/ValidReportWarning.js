import { Alert } from "react-bootstrap";

// Cảnh báo số lần khách sạn bị report đúng; dùng chung cho trang chính và trang Khiếu nại
const ValidReportWarning = ({ count, limit }) => {
  const variant = count >= limit ? "danger" : count >= limit - 1 ? "warning" : count > 0 ? "info" : "light";
  return (
    <Alert variant={variant} className="border">
      <strong>Số lần bị report đúng: {count}/{limit}.</strong>{" "}
      Khiếu nại được Operations Manager chấp nhận (toàn phần hoặc một phần) được tính là report đúng. Nếu vượt quá {limit} lần
      (lần thứ {limit + 1}), tài khoản đối tác sẽ bị <strong>khóa vĩnh viễn</strong>.
      {count >= limit && <> Bạn đã đạt giới hạn: <strong>thêm 1 khiếu nại bị chấp nhận nữa là tài khoản bị khóa.</strong></>}
    </Alert>
  );
};

export default ValidReportWarning;
