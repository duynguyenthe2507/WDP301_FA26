import React, { useState, useContext } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { FaEnvelope, FaLock } from 'react-icons/fa';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:9999/api/auth/login', { email, password });
      const data = response.data;
      login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Card.Body>
          <h2 className="auth-title">VinaStay Premium</h2>
          <p className="text-center text-muted mb-4">Đăng nhập để trải nghiệm dịch vụ</p>

          {error && <Alert variant="danger" className="border-0 rounded-3 shadow-sm">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4" controlId="formBasicEmail">
              <Form.Label className="fw-semibold text-muted small">EMAIL</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type="email"
                  className="auth-form-control ps-4"
                  placeholder="Nhập địa chỉ email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FaEnvelope className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
              </div>
            </Form.Group>

            <Form.Group className="mb-4" controlId="formBasicPassword">
              <div className="d-flex justify-content-between align-items-center">
                <Form.Label className="fw-semibold text-muted small mb-0">MẬT KHẨU</Form.Label>
                <Link to="#" className="small auth-link" style={{ fontSize: '0.8rem' }}>Quên mật khẩu?</Link>
              </div>
              <div className="position-relative mt-2">
                <Form.Control
                  type="password"
                  className="auth-form-control ps-4"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <FaLock className="position-absolute text-muted" style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }} />
              </div>
            </Form.Group>

            <Button variant="warning" type="submit" className="w-100 auth-btn mt-2 mb-3" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </Button>

            <div className="text-center small text-muted">
              Chưa có tài khoản? <Link to="/register" className="auth-link">Đăng ký ngay</Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Login;
