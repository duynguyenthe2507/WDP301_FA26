import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaHotel } from 'react-icons/fa';

const NavigationBar = () => {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="py-3 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold fs-4">
          <FaHotel className="me-2 text-warning" /> Hovi
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>Trang chủ</Nav.Link>
            <Nav.Link as={Link} to="/rooms" active={location.pathname === '/rooms'}>Phòng</Nav.Link>
            <Button as={Link} to="/booking" variant="warning" className="ms-lg-3 mt-3 mt-lg-0 fw-semibold rounded-pill px-4">
              Đặt phòng ngay
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
