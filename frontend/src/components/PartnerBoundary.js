import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Hotel Partner đã đăng nhập chỉ dùng các trang /partner; mọi trang khác đưa về /partner
const PartnerBoundary = () => {
  const { user } = useContext(AuthContext);
  if (user?.role === 'HOTEL_PARTNER') return <Navigate to="/partner" replace />;
  return <Outlet />;
};

export default PartnerBoundary;
