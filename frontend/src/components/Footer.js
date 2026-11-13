import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaHotel, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

const QUICK_LINKS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/hotels', label: 'Tìm khách sạn' },
  { to: '/booking-history', label: 'Đặt phòng của tôi' },
  { to: '/my-disputes', label: 'Khiếu nại của tôi' },
  { to: '/register/partner', label: 'Trở thành đối tác khách sạn' },
];

const CONTACTS = [
  { icon: <FaMapMarkerAlt />, text: 'Hà Nội, Việt Nam' },
  { icon: <FaPhoneAlt />, text: '+84 24 1234 5678' },
  { icon: <FaEnvelope />, text: 'contact@vinastay.com' },
];

const SOCIALS = [
  { icon: <FaFacebook />, label: 'Facebook' },
  { icon: <FaTwitter />, label: 'Twitter' },
  { icon: <FaInstagram />, label: 'Instagram' },
];

const Footer = () => (
  <footer className="bg-dark text-light pt-5 pb-3 mt-auto">
    <Container>
      <Row className="gy-4">
        <Col md={5}>
          <div className="d-flex align-items-center mb-3">
            <FaHotel className="fs-3 text-warning me-2" />
            <h4 className="mb-0 fw-bold">VinaStay</h4>
          </div>
          <p className="text-secondary mb-0">
            Nền tảng đặt phòng khách sạn kết nối du khách và chủ khách sạn: tìm phòng, kiểm tra phòng trống theo thời gian thực
            và thanh toán an toàn qua VNPay.
          </p>
        </Col>
        <Col sm={6} md={3}>
          <h5 className="fw-bold mb-3">Liên kết nhanh</h5>
          <ul className="list-unstyled mb-0">
            {QUICK_LINKS.map((item) => (
              <li className="mb-2" key={item.to}>
                <Link to={item.to} className="text-secondary text-decoration-none hover-text-warning">{item.label}</Link>
              </li>
            ))}
          </ul>
        </Col>
        <Col sm={6} md={4}>
          <h5 className="fw-bold mb-3">Liên hệ</h5>
          <ul className="list-unstyled text-secondary mb-3">
            {CONTACTS.map((item) => (
              <li className="mb-2 d-flex align-items-center gap-2" key={item.text}>
                <span className="text-warning">{item.icon}</span>{item.text}
              </li>
            ))}
          </ul>
          <div className="d-flex gap-3">
            {SOCIALS.map((item) => (
              // shortcut: chưa có trang mạng xã hội thật, khi có thì thay href="#" bằng URL
              <a key={item.label} href="#top" aria-label={item.label} className="text-light fs-4 hover-text-warning">{item.icon}</a>
            ))}
          </div>
        </Col>
      </Row>
      <hr className="my-4 border-secondary" />
      <div className="text-center text-secondary">
        <small>&copy; {new Date().getFullYear()} VinaStay. Bảo lưu mọi quyền.</small>
      </div>
    </Container>
  </footer>
);

export default Footer;
