import React from "react";
import { Button, Card } from "react-bootstrap";
import { FaBed, FaHotel } from "react-icons/fa";
import { Link } from "react-router-dom";

const PartnerDashboard = () => (
  <div>
    <h2 className="mb-2">Bảng điều khiển Đối tác Khách sạn</h2>
    <p className="text-muted mb-4">Quản lý thông tin khách sạn, loại phòng và hoạt động kinh doanh của bạn.</p>
    <div className="row g-3">
      <div className="col-md-6">
        <Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><FaHotel className="text-primary fs-3 mb-3" /><h3 className="h5 fw-bold">Thông tin khách sạn</h3><p className="text-muted small">Cập nhật thông tin cơ bản, tiện nghi, chính sách và hình ảnh khách sạn.</p><Button as={Link} to="/partner/hotel-information" variant="outline-dark" size="sm">Quản lý thông tin</Button></Card.Body></Card>
      </div>
      <div className="col-md-6">
        <Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><FaBed className="text-primary fs-3 mb-3" /><h3 className="h5 fw-bold">Loại phòng</h3><p className="text-muted small">Xem, thêm và cập nhật các loại phòng đang kinh doanh.</p><Button as={Link} to="/partner/room-types" variant="outline-dark" size="sm">Quản lý loại phòng</Button></Card.Body></Card>
      </div>
    </div>
  </div>
);

export default PartnerDashboard;
