import React from 'react';
import { Card, Row, Col, Button, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaHotel, FaCheckCircle, FaArrowRight, FaSignInAlt } from 'react-icons/fa';

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page py-5">
      <Container style={{ maxWidth: '900px' }}>
        <Card className="auth-card border-0 shadow-lg mx-auto" style={{ maxWidth: '100%' }}>
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-5">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-3">
                <FaHotel className="text-warning fs-2 me-2" />
                <span className="fs-3 fw-bold text-dark font-serif" style={{ letterSpacing: '1px' }}>VinaStay</span>
              </Link>
              <h2 className="auth-title mb-2">Đăng Ký Tài Khoản</h2>
              <p className="text-muted mx-auto" style={{ maxWidth: '540px', fontSize: '0.95rem' }}>
                Vui lòng chọn loại tài khoản phù hợp với nhu cầu của bạn để tiếp tục quá trình đăng ký
              </p>
            </div>

            <Row className="g-4 mb-4">
              {/* Card 1: Khách Hàng */}
              <Col md={6}>
                <div
                  className="role-selection-card h-100 p-4 rounded-4 border d-flex flex-column justify-content-between position-relative"
                  onClick={() => navigate('/register/customer')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="role-card-badge customer-badge mb-3">
                    Dành Cho Cá Nhân
                  </div>

                  <div>
                    <div className="role-icon-wrapper customer-icon mb-3">
                      <FaUser className="fs-3" />
                    </div>

                    <h4 className="fw-bold mb-2 text-dark">Khách Hàng</h4>
                    <p className="text-muted small mb-4">
                      Dành cho du khách muốn tìm kiếm, so sánh và đặt phòng khách sạn, căn hộ, resort trên toàn quốc.
                    </p>

                    <ul className="list-unstyled mb-4 role-benefit-list">
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-warning me-2 flex-shrink-0" />
                        <span>Đặt phòng nhanh chóng & xác nhận tức thì</span>
                      </li>
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-warning me-2 flex-shrink-0" />
                        <span>Tích điểm thành viên & ưu đãi độc quyền</span>
                      </li>
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-warning me-2 flex-shrink-0" />
                        <span>Dễ dàng quản lý lịch sử đặt phòng & hóa đơn</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    as={Link}
                    to="/register/customer"
                    variant="warning"
                    className="w-100 fw-semibold rounded-pill py-2 d-flex align-items-center justify-content-center text-white"
                  >
                    <span>Đăng Ký Khách Hàng</span>
                    <FaArrowRight className="ms-2" />
                  </Button>
                </div>
              </Col>

              {/* Card 2: Đối Tác Khách Sạn */}
              <Col md={6}>
                <div
                  className="role-selection-card h-100 p-4 rounded-4 border d-flex flex-column justify-content-between position-relative partner-card-theme"
                  onClick={() => navigate('/register/partner')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="role-card-badge partner-badge mb-3">
                    Dành Cho Doanh Nghiệp
                  </div>

                  <div>
                    <div className="role-icon-wrapper partner-icon mb-3">
                      <FaHotel className="fs-3" />
                    </div>

                    <h4 className="fw-bold mb-2 text-dark">Đối Tác Khách Sạn</h4>
                    <p className="text-muted small mb-4">
                      Dành cho chủ sở hữu, quản lý khách sạn, homestay, resort muốn đăng bán phòng trên nền tảng VinaStay.
                    </p>

                    <ul className="list-unstyled mb-4 role-benefit-list">
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-success me-2 flex-shrink-0" />
                        <span>Tiếp cận hàng triệu du khách tiềm năng</span>
                      </li>
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-success me-2 flex-shrink-0" />
                        <span>Hệ thống quản lý phòng & đơn đặt chuyên nghiệp</span>
                      </li>
                      <li className="d-flex align-items-center mb-2 text-secondary small">
                        <FaCheckCircle className="text-success me-2 flex-shrink-0" />
                        <span>Thống kê doanh thu minh bạch & hỗ trợ 24/7</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    as={Link}
                    to="/register/partner"
                    variant="dark"
                    className="w-100 fw-semibold rounded-pill py-2 d-flex align-items-center justify-content-center text-white partner-action-btn"
                  >
                    <span>Đăng Ký Đối Tác</span>
                    <FaArrowRight className="ms-2" />
                  </Button>
                </div>
              </Col>
            </Row>

            <div className="text-center pt-3 border-top text-muted small">
              Bạn đã có tài khoản VinaStay?{' '}
              <Link to="/login" className="auth-link fw-semibold ms-1 d-inline-flex align-items-center">
                <FaSignInAlt className="me-1" /> Đăng nhập ngay
              </Link>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Register;
