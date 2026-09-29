import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col, Container } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaArrowLeft, FaCheckCircle, FaHotel } from 'react-icons/fa';

const CustomerRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone_number: '',
    role: 'CUSTOMER'
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        role: 'CUSTOMER'
      };

      await axios.post('http://localhost:9999/api/auth/register', payload);

      alert('Đăng ký tài khoản khách hàng thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page py-4">
      <Container style={{ maxWidth: '650px' }}>
        <Card className="auth-card border-0 shadow-lg mx-auto" style={{ maxWidth: '100%' }}>
          <Card.Body className="p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Link to="/register" className="text-muted text-decoration-none small d-inline-flex align-items-center hover-underline">
                <FaArrowLeft className="me-2" /> Chọn vai trò khác
              </Link>
              <div className="role-card-badge customer-badge">
                <FaUser className="me-1" /> Khách Hàng
              </div>
            </div>

            <div className="text-center mb-4">
              <Link to="/" className="text-decoration-none d-inline-flex align-items-center mb-2">
                <FaHotel className="text-warning fs-3 me-2" />
                <span className="fs-4 fw-bold text-dark font-serif" style={{ letterSpacing: '1px' }}>VinaStay</span>
              </Link>
              <h2 className="auth-title mb-1">Đăng Ký Người Dùng</h2>
              <p className="text-muted small">Tạo tài khoản để đặt phòng nhanh chóng và nhận ưu đãi độc quyền</p>
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
                    <Form.Label className="fw-semibold text-muted small">HỌ VÀ TÊN</Form.Label>
                    <div className="position-relative">
                      <Form.Control 
                        type="text" 
                        name="full_name"
                        className="auth-form-control ps-4"
                        placeholder="Nguyễn Văn A" 
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                      />
                      <FaUser className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                    </div>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold text-muted small">SỐ ĐIỆN THOẠI</Form.Label>
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
                <Form.Label className="fw-semibold text-muted small">EMAIL</Form.Label>
                <div className="position-relative">
                  <Form.Control 
                    type="email" 
                    name="email"
                    className="auth-form-control ps-4"
                    placeholder="name@example.com" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <FaEnvelope className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                </div>
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

              <div className="p-3 bg-light rounded-3 mb-4 small text-muted">
                <div className="d-flex align-items-center mb-1">
                  <FaCheckCircle className="text-warning me-2" />
                  <span>Miễn phí đăng ký và sử dụng trọn đời</span>
                </div>
                <div className="d-flex align-items-center">
                  <FaCheckCircle className="text-warning me-2" />
                  <span>Bảo mật thông tin cá nhân theo tiêu chuẩn quốc tế</span>
                </div>
              </div>

              <Button variant="warning" type="submit" className="w-100 auth-btn mb-3 text-white fw-bold py-2" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Người Dùng'}
              </Button>

              <div className="text-center small text-muted mb-3">
                Bạn là đối tác khách sạn?{' '}
                <Link to="/register/partner" className="auth-link fw-semibold">
                  Đăng ký tài khoản đối tác
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

export default CustomerRegister;
