import React, { useContext } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiLogOut,
  FiMessageSquare,
  FiSettings,
  FiShield,
} from 'react-icons/fi';
import { AuthContext } from '../../../context/AuthContext';
import '../manager.css';

const navigation = [
  { to: '/manager', label: 'Tá»•ng quan', icon: FiHome, end: true },
  { to: '/manager/verifications', label: 'XÃ¡c minh khÃ¡ch sáº¡n', icon: FiShield },
  { to: '/manager/partner-operations', label: 'YÃªu cáº§u Ä‘á»‘i tÃ¡c', icon: FiMessageSquare },
  { to: '/manager/disputes', label: 'Tranh cháº¥p & há»— trá»£', icon: FiAlertCircle },
  { to: '/manager/refunds', label: 'PhÃª duyá»‡t hoÃ n tiá»n', icon: FiCreditCard },
  { to: '/manager/commissions', label: 'ChÃ­nh sÃ¡ch hoa há»“ng', icon: FiSettings },
  { to: '/manager/payouts', label: 'PhÃª duyá»‡t chi tráº£', icon: FiClipboard },
  { to: '/manager/audit-history', label: 'Lá»‹ch sá»­ thao tÃ¡c', icon: FiFileText },
];

const pageTitles = {
  '/manager': 'Tá»•ng quan váº­n hÃ nh',
  '/manager/verifications': 'XÃ¡c minh khÃ¡ch sáº¡n',
  '/manager/partner-operations': 'YÃªu cáº§u Ä‘á»‘i tÃ¡c',
  '/manager/disputes': 'Tranh cháº¥p & há»— trá»£',
  '/manager/refunds': 'PhÃª duyá»‡t hoÃ n tiá»n',
  '/manager/commissions': 'ChÃ­nh sÃ¡ch hoa há»“ng',
  '/manager/payouts': 'PhÃª duyá»‡t chi tráº£',
  '/manager/audit-history': 'Lá»‹ch sá»­ thao tÃ¡c',
};

const ManagerLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Quáº£n lÃ½ váº­n hÃ nh';

  return (
    <div className="om-shell">
      <aside className="om-sidebar">
        <Link to="/manager" className="om-brand">
          <span className="om-brand-mark"><FiActivity /></span>
          <span><strong>VinaStay</strong><small>Trung tÃ¢m váº­n hÃ nh</small></span>
        </Link>
        <div className="om-sidebar-caption">KHÃ”NG GIAN Váº¬N HÃ€NH</div>
        <nav className="om-nav">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `om-nav-link${isActive ? ' active' : ''}`}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="om-sidebar-footer">
          <Link to="/" className="om-site-link">Xem trang Ä‘áº·t phÃ²ng</Link>
          <button className="om-logout" type="button" onClick={logout}><FiLogOut /> ÄÄƒng xuáº¥t</button>
        </div>
      </aside>
      <section className="om-main">
        <header className="om-topbar">
          <div><p className="om-breadcrumb">VinaStay / Quáº£n lÃ½ váº­n hÃ nh</p><h1>{title}</h1></div>
          <div className="om-user"><span className="om-user-avatar">{user?.fullName?.slice(0, 1)?.toUpperCase() || 'O'}</span><div><strong>{user?.fullName || 'Quáº£n lÃ½ váº­n hÃ nh'}</strong><small>Quáº£n lÃ½ váº­n hÃ nh</small></div></div>
        </header>
        <main className="om-content"><Outlet /></main>
      </section>
    </div>
  );
};

export default ManagerLayout;

