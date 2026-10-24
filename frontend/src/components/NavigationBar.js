import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaHotel, FaUserCircle, FaHistory, FaStar } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const NavigationBar = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="py-3 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold fs-4">
          <FaHotel className="me-2 text-warning" /> VinaStay
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>Trang chủ</Nav.Link>
            <Nav.Link as={Link} to="/hotels" active={location.pathname === '/hotels'}>Khách sạn</Nav.Link>

            {user ? (
              <>
                {/* Link lịch sử đặt phòng, đánh giá & hồ sơ - chỉ hiện với CUSTOMER */}
                {user.role === 'CUSTOMER' && (
                  <>
                    <Nav.Link as={Link} to="/booking-history" active={location.pathname === '/booking-history'} className="d-flex align-items-center">
                      <FaHistory className="me-1" /> Lịch sử đặt phòng
                    </Nav.Link>
                    <Nav.Link as={Link} to="/profile" active={location.pathname === '/profile'} className="d-flex align-items-center">
                      <FaUserCircle className="me-1" /> {user.fullName || 'Hồ sơ'}
                    </Nav.Link>
                  </>
                )}

                {/* Link dashboard cho các role khác */}
                {user.role !== 'CUSTOMER' && (
                  <Nav.Link as={Link} to={user.role === 'ADMIN' ? '/admin' : (user.role === 'HOTEL_PARTNER' || user.role === 'PARTNER') ? '/partner' : (user.role === 'OPERATIONS_MANAGER' || user.role === 'STAFF') ? '/manager' : '/'} className="d-flex align-items-center">
                    <FaUserCircle className="me-1" /> {user.fullName || 'Tài khoản'}
                  </Nav.Link>
                )}

                <Button onClick={logout} variant="outline-light" className="ms-lg-3 mt-3 mt-lg-0 rounded-pill px-4">
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/login" state={{ from: location }} variant="outline-light" className="ms-lg-2 mt-3 mt-lg-0 rounded-pill px-4">
                  Đăng nhập
                </Button>
                <Button as={Link} to="/register" variant="warning" className="ms-lg-2 mt-3 mt-lg-0 fw-semibold rounded-pill px-4">
                  Đăng ký
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
