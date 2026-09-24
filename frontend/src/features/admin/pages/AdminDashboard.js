import React from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div>
      <h2 className="mb-4">Bảng điều khiển Quản trị viên (Admin)</h2>
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <p>Chào mừng Admin. Tại đây bạn có thể quản lý người dùng, cài đặt hệ thống và xem các báo cáo tổng quan.</p>
          <Button as={Link} to="/admin/users">Quản lý tài khoản</Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminDashboard;
