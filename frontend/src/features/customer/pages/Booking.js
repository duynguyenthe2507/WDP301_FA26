import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

const Booking = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get('roomId');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    specialRequests: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
    }, 1000);
  };

  if (submitted) {
    return (
      <Container className="py-5 text-center min-vh-100 d-flex flex-column justify-content-center align-items-center">
        <div className="bg-success rounded-circle d-flex align-items-center justify-content-center text-white mb-4" style={{width: '80px', height: '80px', fontSize: '40px'}}>✓</div>
        <h1 className="display-4 fw-bold">Đặt phòng thành công!</h1>
        <p className="lead text-muted mb-4">Cảm ơn bạn, {formData.firstName}. Đơn đặt phòng của bạn đã được xác nhận.</p>
        <p>Một email xác nhận đã được gửi đến <strong>{formData.email}</strong>.</p>
        <Button href="/" variant="warning" className="px-5 py-2 mt-3 rounded-pill fw-bold">Về trang chủ</Button>
      </Container>
    );
  }

  return (
    <div className="bg-light py-5 min-vh-100">
      <Container>
        <div className="text-center mb-5">
          <h1 className="fw-bold display-5">Hoàn tất Đặt phòng</h1>
          <p className="text-muted">Vui lòng điền thông tin của bạn dưới đây để xác nhận đặt phòng.</p>
        </div>

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Card.Header className="bg-dark text-warning p-4 border-0 text-center">
                 <h4 className="m-0 fw-bold">Thông tin khách hàng</h4>
              </Card.Header>
              <Card.Body className="p-4 p-md-5">
                <Form onSubmit={handleSubmit}>
                  <Row className="mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Tên</Form.Label>
                        <Form.Control type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" placeholder="Ví dụ: Nam" />
                      </Form.Group>
                    </Col>
                    <Col md={6} className="mt-4 mt-md-0">
                      <Form.Group>
                        <Form.Label className="fw-semibold">Họ</Form.Label>
                        <Form.Control type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" placeholder="Nguyễn" />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Địa chỉ Email</Form.Label>
                        <Form.Control type="email" name="email" required value={formData.email} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" placeholder="namnguyen@example.com" />
                      </Form.Group>
                    </Col>
                    <Col md={6} className="mt-4 mt-md-0">
                      <Form.Group>
                        <Form.Label className="fw-semibold">Số điện thoại</Form.Label>
                        <Form.Control type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" placeholder="+84 123 456 789" />
                      </Form.Group>
                    </Col>
                  </Row>

                  <hr className="my-5 border-secondary text-muted" />
                  
                  <h5 className="fw-bold mb-4">Chi tiết lưu trú</h5>
                  <Row className="mb-4">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Ngày nhận phòng</Form.Label>
                        <Form.Control type="date" name="checkIn" required value={formData.checkIn} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" />
                      </Form.Group>
                    </Col>
                    <Col md={4} className="mt-4 mt-md-0">
                      <Form.Group>
                        <Form.Label className="fw-semibold">Ngày trả phòng</Form.Label>
                        <Form.Control type="date" name="checkOut" required value={formData.checkOut} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" />
                      </Form.Group>
                    </Col>
                    <Col md={4} className="mt-4 mt-md-0">
                      <Form.Group>
                        <Form.Label className="fw-semibold">Số khách</Form.Label>
                        <Form.Select name="guests" value={formData.guests} onChange={handleChange} className="p-3 bg-light border-0 rounded-3">
                          <option value="1">1 Khách</option>
                          <option value="2">2 Khách</option>
                          <option value="3">3 Khách</option>
                          <option value="4">4 Khách</option>
                          <option value="5+">5+ Khách</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-5">
                    <Form.Label className="fw-semibold">Yêu cầu đặc biệt (Tùy chọn)</Form.Label>
                    <Form.Control as="textarea" rows={4} name="specialRequests" value={formData.specialRequests} onChange={handleChange} className="p-3 bg-light border-0 rounded-3" placeholder="Bất kỳ nhu cầu hay yêu cầu đặc biệt nào..." />
                  </Form.Group>

                  <div className="d-grid">
                    <Button type="submit" variant="warning" size="lg" className="py-3 fw-bold rounded-pill shadow">
                      Xác nhận Đặt phòng
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Booking;
