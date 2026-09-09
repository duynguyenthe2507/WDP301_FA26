import React from 'react';
import { Card } from 'react-bootstrap';

const ManagerDashboard = () => {
  return (
    <div>
      <h2 className="mb-4">Bảng điều khiển Quản lý Nền tảng</h2>
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <p>Chào mừng Quản lý nền tảng. Tại đây bạn có thể theo dõi toàn bộ hoạt động của hệ thống, quản lý đối tác và kiểm duyệt đánh giá.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
