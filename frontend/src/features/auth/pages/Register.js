import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaUserTie } from 'react-icons/fa';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    setLoading(true);

    try {
      await axios.post('http://localhost:9999/api/auth/register', formData);

      // Success
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card" style={{ maxWidth: '600px' }}>
        <Card.Body>
          <h2 className="auth-title">VinaStay Premium</h2>
          <p className="text-center text-muted mb-4">Mở tài khoản để khám phá thế giới</p>
          
          {error && <Alert variant="danger" className="border-0 rounded-3 shadow-sm">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-4">
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
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold text-muted small">SỐ ĐIỆN THOẠI</Form.Label>
                  <div className="position-relative">
                    <Form.Control 
                      type="text" 
                      name="phone_number"
                      className="auth-form-control ps-4"
                      placeholder="0912345678" 
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                    <FaPhone className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
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
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold text-muted small">MẬT KHẨU</Form.Label>
                  <div className="position-relative">
                    <Form.Control 
                      type="password" 
                      name="password"
                      className="auth-form-control ps-4"
                      placeholder="Nhập mật khẩu" 
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <FaLock className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                  </div>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold text-muted small">VAI TRÒ</Form.Label>
                  <div className="position-relative">
                    <Form.Select 
                      name="role" 
                      className="auth-form-control ps-4"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="CUSTOMER">Khách hàng</option>
                      <option value="PARTNER">Đối tác khách sạn</option>
                    </Form.Select>
                    <FaUserTie className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Button variant="warning" type="submit" className="w-100 auth-btn mt-2 mb-4" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng Ký Tài Khoản'}
            </Button>

            <div className="text-center small text-muted">
              Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập</Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Register;
