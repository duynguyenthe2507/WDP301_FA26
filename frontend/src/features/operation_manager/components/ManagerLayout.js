import React, { useContext } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLogOut,
  FiPercent,
  FiShield,
} from 'react-icons/fi';
import { AuthContext } from '../../../context/AuthContext';
import '../manager.css';

const navigation = [
  { to: '/manager', label: 'Tổng quan', icon: FiHome, end: true },
  { to: '/manager/verifications', label: 'Xác minh khách sạn', icon: FiShield },
  { to: '/manager/disputes', label: 'Tranh chấp & đối chất', icon: FiAlertCircle },
  { to: '/manager/compensations', label: 'Bồi thường khách hàng', icon: FiDollarSign },
  { to: '/manager/commissions', label: 'Chính sách hoa hồng', icon: FiPercent },
  { to: '/manager/payouts', label: 'Phê duyệt chi trả', icon: FiClipboard },
  { to: '/manager/audit-history', label: 'Lịch sử thao tác', icon: FiFileText },
];

const pageTitles = {
  '/manager': 'Tổng quan vận hành',
  '/manager/verifications': 'Xác minh khách sạn',
  '/manager/disputes': 'Tranh chấp & đối chất hai bên',
  '/manager/compensations': 'Bồi thường & đính chính thông tin khách hàng',
  '/manager/refunds': 'Bồi thường & đính chính thông tin khách hàng',
  '/manager/commissions': 'Chính sách hoa hồng theo khách sạn',
  '/manager/payouts': 'Phê duyệt chi trả',
  '/manager/audit-history': 'Lịch sử thao tác',
};

const ManagerLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Quản lý vận hành';

  return (
    <div className="om-shell">
      <aside className="om-sidebar">
        <Link to="/manager" className="om-brand">
          <span className="om-brand-mark"><FiActivity /></span>
          <span><strong>VinaStay</strong><small>Trung tâm vận hành</small></span>
        </Link>
        <div className="om-sidebar-caption">KHÔNG GIAN VẬN HÀNH</div>
        <nav className="om-nav">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `om-nav-link${isActive ? ' active' : ''}`}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="om-sidebar-footer">
          <Link to="/" className="om-site-link">Xem trang đặt phòng</Link>
          <button className="om-logout" type="button" onClick={logout}><FiLogOut /> Đăng xuất</button>
        </div>
      </aside>
      <section className="om-main">
        <header className="om-topbar">
          <div><p className="om-breadcrumb">VinaStay / Quản lý vận hành</p><h1>{title}</h1></div>
          <div className="om-user"><span className="om-user-avatar">{user?.fullName?.slice(0, 1)?.toUpperCase() || 'O'}</span><div><strong>{user?.fullName || 'Quản lý vận hành'}</strong><small>Quản lý vận hành</small></div></div>
        </header>
        <main className="om-content"><Outlet /></main>
      </section>
    </div>
  );
};

export default ManagerLayout;
