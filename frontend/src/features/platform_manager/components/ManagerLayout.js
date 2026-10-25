import { useContext } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { FiAlertCircle, FiCreditCard, FiHome, FiLogOut, FiShield } from 'react-icons/fi';
import { AuthContext } from '../../../context/AuthContext';
import '../manager.css';

const navigation = [
  { to: '/manager', label: 'Tổng quan', icon: FiHome, end: true },
  { to: '/manager/verifications', label: 'Xác minh khách sạn', icon: FiShield },
  { to: '/manager/disputes', label: 'Tranh chấp & hỗ trợ', icon: FiAlertCircle },
  { to: '/manager/refunds', label: 'Phê duyệt hoàn tiền', icon: FiCreditCard },
];

const ManagerLayout = () => {
  const { logout, user } = useContext(AuthContext);
  return <div className="om-shell"><aside className="om-sidebar"><Link to="/manager" className="om-brand">VinaStay<small>Trung tâm vận hành</small></Link><nav className="om-nav">{navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `om-nav-link${isActive ? ' active' : ''}`}><Icon /><span>{label}</span></NavLink>)}</nav><button className="om-logout" onClick={logout}><FiLogOut /> Đăng xuất</button></aside><section className="om-main"><header className="om-topbar"><div><p>VinaStay / Quản lý vận hành</p><h1>Trung tâm vận hành</h1></div><strong>{user?.fullName || 'Operations Manager'}</strong></header><main className="om-content"><Outlet /></main></section></div>;
};

export default ManagerLayout;
