import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebook, FaTwitter, FaInstagram, FaHotel } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-5 mt-auto">
      <Container>
        <Row className="gy-4">
          <Col md={4}>
            <div className="d-flex align-items-center mb-3">
              <FaHotel className="fs-3 text-warning me-2" />
              <h4 className="mb-0 fw-bold">Hovi</h4>
            </div>
            <p className="text-secondary">
              Trải nghiệm dịch vụ lưu trú tuyệt vời nhất với Hovi. Đặt phòng ngay hôm nay và tận hưởng không gian thoải mái cao cấp, tiện nghi đẳng cấp thế giới, và những kỷ niệm khó quên.
            </p>
          </Col>
          <Col md={4}>
            <h5 className="fw-bold mb-3">Liên kết nhanh</h5>
            <ul className="list-unstyled">
              <li className="mb-2"><a href="/" className="text-secondary text-decoration-none hover-text-warning">Trang chủ</a></li>
              <li className="mb-2"><a href="/rooms" className="text-secondary text-decoration-none hover-text-warning">Phòng & Suite</a></li>
              <li className="mb-2"><a href="/booking" className="text-secondary text-decoration-none hover-text-warning">Đặt phòng ngay</a></li>
            </ul>
          </Col>
          <Col md={4}>
            <h5 className="fw-bold mb-3">Liên hệ</h5>
            <ul className="list-unstyled text-secondary">
              <li className="mb-2">📍 123 Đại lộ Luxury, Hà Nội</li>
              <li className="mb-2">📞 +1 234 567 8900</li>
              <li className="mb-2">✉️ contact@hovi.com</li>
            </ul>
            <div className="d-flex gap-3 mt-3">
              <a href="#facebook" className="text-light fs-4 hover-text-warning"><FaFacebook /></a>
              <a href="#twitter" className="text-light fs-4 hover-text-warning"><FaTwitter /></a>
              <a href="#instagram" className="text-light fs-4 hover-text-warning"><FaInstagram /></a>
            </div>
          </Col>
        </Row>
        <hr className="my-4 border-secondary" />
        <div className="text-center text-secondary">
          <small>&copy; {new Date().getFullYear()} Hovi Hotels. Bảo lưu mọi quyền.</small>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
