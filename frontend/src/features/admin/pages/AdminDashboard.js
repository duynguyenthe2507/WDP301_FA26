import React from 'react';
import { Card } from 'react-bootstrap';

const AdminDashboard = () => {
  return (
    <div>
      <h2 className="mb-4">Bảng điều khiển Quản trị viên (Admin)</h2>
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <p>Chào mừng Admin. Tại đây bạn có thể quản lý người dùng, cài đặt hệ thống và xem các báo cáo tổng quan.</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminDashboard;
