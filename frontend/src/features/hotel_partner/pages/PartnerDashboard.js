import React from 'react';
import { Card } from 'react-bootstrap';

const PartnerDashboard = () => {
  return (
    <div>
      <h2 className="mb-4">Bảng điều khiển Đối tác Khách sạn</h2>
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <p>Chào mừng Đối tác. Tại đây bạn có thể quản lý danh sách phòng của mình, xem đơn đặt phòng và báo cáo doanh thu.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PartnerDashboard;
