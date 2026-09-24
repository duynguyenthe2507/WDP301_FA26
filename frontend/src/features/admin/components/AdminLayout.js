import React, { useContext } from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { AuthContext } from '../../../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace />;

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand as={Link} to="/admin" className="fw-bold">VinaStay Admin Panel</Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-navbar-nav" />
          <Navbar.Collapse id="admin-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/admin">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/admin/users">Quản lý tài khoản</Nav.Link>
              <Nav.Link as={Link} to="/">View Site</Nav.Link>
              <Nav.Link className="text-danger" onClick={logout}>Logout</Nav.Link>
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
