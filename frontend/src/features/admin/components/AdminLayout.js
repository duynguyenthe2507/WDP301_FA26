import React, { useContext } from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import {FaHotel} from "react-icons/fa"
import { AuthContext } from '../../../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand as={Link} to="/admin" className="fw-bold">
            <FaHotel className="me-2 text-warning" /> VinaStay Admin Panel
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-navbar-nav" />
          <Navbar.Collapse id="admin-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/admin">
                Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/admin/users">
                Quản lý tài khoản
              </Nav.Link>
              <Nav.Link as={Link} to="/admin/system-config">
                Cấu hình hệ thống
              </Nav.Link>
              <Nav.Link as={Link} to="/admin/logs">
                Nhật ký hệ thống
              </Nav.Link>
              <Button
                onClick={logout}
                variant="outline-light"
                className="ms-lg-3 mt-3 mt-lg-0 rounded-pill px-4"
              >
                Đăng xuất
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main className="flex-grow-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
