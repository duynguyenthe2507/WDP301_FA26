import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col, Container } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaHotel, FaEnvelope, FaLock, FaPhone, FaArrowLeft, FaShieldAlt, FaHandshake, FaUserTie } from 'react-icons/fa';

const PartnerRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone_number: '',
    agreedToTerms: true,
    role: 'PARTNER'
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password.length < 6) {
      setError('Mật khẩu đối tác phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!formData.agreedToTerms) {
      setError('Vui lòng đồng ý với Điều khoản hợp tác đối tác của VinaStay');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        role: 'PARTNER'
      };

      await axios.post('http://localhost:9999/api/auth/register', payload);

      alert('Đăng ký tài khoản Đối tác thành công! Vui lòng đăng nhập để bắt đầu quản lý cơ sở lưu trú của bạn.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký đối tác thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page py-4">
      <Container style={{ maxWidth: '680px' }}>
        <Card className="auth-card border-0 shadow-lg mx-auto" style={{ maxWidth: '100%' }}>
          <Card.Body className="p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Link to="/register" className="text-muted text-decoration-none small d-inline-flex align-items-center hover-underline">
                <FaArrowLeft className="me-2" /> Chọn vai trò khác
              </Link>
              <div className="role-card-badge partner-badge">
                <FaHotel className="me-1" /> Đối Tác Khách Sạn
              </div>
            </div>

            <div className="text-center mb-4">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-2">
                <FaHotel className="text-warning fs-3 me-2" />
                <span className="fs-4 fw-bold text-dark font-serif" style={{ letterSpacing: '1px' }}>VinaStay</span>
                <span className="badge bg-dark ms-2 text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Partner</span>
              </Link>
              <h2 className="auth-title mb-1">Đăng Ký Đối Tác Khách Sạn</h2>
              <p className="text-muted small">Gia nhập mạng lưới VinaStay để tiếp cận hàng triệu du khách và tối ưu hóa doanh thu</p>
            </div>

            {error && (
              <Alert variant="danger" className="border-0 rounded-3 shadow-sm py-2 px-3 small mb-4" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-muted small">NGƯỜI LIÊN HỆ / QUẢN LÝ</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        name="full_name"
                        className="auth-form-control ps-4"
                        placeholder="Họ tên người đại diện"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                      />
                      <FaUserTie className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                    </div>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-muted small">SỐ ĐIỆN THOẠI KINH DOANH</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="tel"
                        name="phone_number"
                        className="auth-form-control ps-4"
                        placeholder="0912345678"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                      />
                      <FaPhone className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-muted small">EMAIL DOANH NGHIỆP / LIÊN HỆ</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="email"
                    name="email"
                    className="auth-form-control ps-4"
                    placeholder="partner@hotel.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <FaEnvelope className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                </div>
                <Form.Text className="text-muted" style={{ fontSize: '0.78rem' }}>
                  Email này sẽ dùng để đăng nhập vào trang Quản Trị Đối Tác và nhận thông báo đặt phòng.
                </Form.Text>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-muted small">MẬT KHẨU</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="password"
                        name="password"
                        className="auth-form-control ps-4"
                        placeholder="Ít nhất 6 ký tự"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      <FaLock className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                    </div>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-muted small">XÁC NHẬN MẬT KHẨU</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        className="auth-form-control ps-4"
                        placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                      <FaLock className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <div className="p-3 bg-light rounded-3 mb-3 small text-muted">
                <div className="d-flex align-items-center mb-1">
                  <FaShieldAlt className="text-success me-2" />
                  <span>Quyền truy cập bảng điều khiển Partner Dashboard quản lý phòng & khách lưu trú</span>
                </div>
                <div className="d-flex align-items-center">
                  <FaHandshake className="text-success me-2" />
                  <span>Chính sách chiết khấu cạnh tranh và thanh toán định kỳ minh bạch</span>
                </div>
              </div>

              <Form.Group className="mb-4" controlId="agreeTerms">
                <Form.Check
                  type="checkbox"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  label={
                    <span className="small text-muted">
                      Tôi đồng ý với <Link to="#" className="auth-link">Điều khoản dịch vụ</Link> và <Link to="#" className="auth-link">Quy chế đối tác lưu trú</Link> của VinaStay
                    </span>
                  }
                  required
                />
              </Form.Group>

              <Button variant="dark" type="submit" className="w-100 auth-btn partner-action-btn mb-3 text-white fw-bold py-2" disabled={loading}>
                {loading ? 'Đang kích hoạt tài khoản đối tác...' : 'Đăng Ký Đối Tác Khách Sạn'}
              </Button>

              <div className="text-center small text-muted mb-3">
                Bạn là khách hàng muốn đặt phòng?{' '}
                <Link to="/register/customer" className="auth-link fw-semibold">
                  Đăng ký tài khoản người dùng
                </Link>
              </div>

              <div className="text-center small text-muted pt-2 border-top">
                Đã có tài khoản? <Link to="/login" className="auth-link fw-semibold">Đăng nhập</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default PartnerRegister;
