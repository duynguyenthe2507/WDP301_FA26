import React, { useState, useEffect } from "react";
import { Row, Col, Card } from "react-bootstrap";
import axios from "axios";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    blockedUsers: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:9999/api/admin/dashboard",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Lưu dữ liệu Backend trả về vào State
        if (response.data) {
          setStats(response.data.stats || stats);
          setRecentLogs(response.data.recentLogs || []);
        }
      } catch (error) {
        console.log("Chưa nối Backend hoặc lỗi API, hiển thị dữ liệu mẫu.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  });

  return (
    <div>
       <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="text-center p-3 border">
            <Card.Body>
              <Card.Title className="fw-bold text-uppercase fs-6">
                TỔNG SỐ TÀI KHOẢN
              </Card.Title>
              <h2 className="fw-bold my-2">
                {loading ? "..." : stats.totalUsers}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center p-3 border">
            <Card.Body>
              <Card.Title className="fw-bold text-uppercase fs-6">
                ĐANG HOẠT ĐỘNG
              </Card.Title>
              <h2 className="fw-bold my-2">
                {loading ? "..." : stats.activeUsers}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center p-3 border">
            <Card.Body>
              <Card.Title className="fw-bold text-uppercase fs-6">
                TẠM KHÓA
              </Card.Title>
              <h2 className="fw-bold my-2">
                {loading ? "..." : stats.suspendedUsers}
              </h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center p-3 border">
            <Card.Body>
              <Card.Title className="fw-bold text-uppercase fs-6">
                BỊ KHÓA
              </Card.Title>
              <h2 className="fw-bold my-2">
                {loading ? "..." : stats.blockedUsers}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border p-3">
        <Card.Body>
          <h5 className="fw-bold mb-3 text-uppercase">
            NHẬT KÝ KIỂM TOÁN GẦN ĐÂY
          </h5>

          {recentLogs.length > 0 ? (
            <ul className="list-unstyled mb-0">
              {recentLogs.map((log, index) => {
                const dateStr = new Date(log.createdAt).toLocaleDateString(
                  "vi-VN",
                );
                const targetName =
                  log.target_user_id?.fullName ||
                  log.target_user_id?.email ||
                  "tài khoản";

                return (
                  <li key={index} className="py-2 border-bottom fs-6">
                    <span className="fw-bold">{dateStr}: Admin - </span>
                    <span>
                      {log.action === "ACCOUNT_SUSPENDED" &&
                        `Đổi trạng thái "Tạm khóa" cho ${targetName} vì ${log.new_reason || "nghi ngờ điều tra"}`}
                      {log.action === "ACCOUNT_DEACTIVATED" &&
                        `Đổi trạng thái "Bị khóa" cho ${targetName} vì ${log.new_reason || "vi phạm hợp đồng"}`}
                      {log.action === "ACCOUNT_ACTIVATED" &&
                        `Mở khóa hoạt động lại cho ${targetName}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="fs-6 text-muted">
              <p className="mb-0">Không có nhật ký kiểm toán nào gần đây</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminDashboard;
