import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, loggedOutRef } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border" style={{ color: '#d4af37', width: '3rem', height: '3rem' }} />
      </div>
    );
  }

  // Lưu lại trang (kèm state) đang truy cập để quay lại sau khi đăng nhập
  if (!user) {
    // Vừa bấm đăng xuất: về trang chủ thay vì sang trang đăng nhập
    if (loggedOutRef?.current) return <Navigate to="/" replace />;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
