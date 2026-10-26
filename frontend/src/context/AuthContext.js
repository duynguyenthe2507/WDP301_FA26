import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const AuthContext = createContext({
  user: null,
  token: null,
  login: () => { },
  logout: () => { },
  loading: false,
  setUser: () => { }
});

// Các trang yêu cầu đăng nhập (khớp với ProtectedRoute / layout theo role trong App.js)
const PROTECTED_PREFIXES = ['/booking', '/booking-history', '/profile', '/change-password', '/my-reviews', '/reviews', '/admin', '/partner', '/manager'];

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(token && !user));
  const navigate = useNavigate();

  // Đánh dấu vừa chủ động đăng xuất
  const loggedOutRef = useRef(false);

  const logout = useCallback(() => {
    loggedOutRef.current = true;
    setTimeout(() => { loggedOutRef.current = false; }, 500);
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Ở lại trang hiện tại nếu trang đó công khai, ngược lại về trang chủ
    const path = window.location.pathname;
    const needsLogin = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
      && !path.startsWith('/booking/vnpay-return');
    if (needsLogin) navigate('/');
  }, [navigate]);

  const fetchMe = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:9999/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error("Error fetching user", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  // redirectTo: { pathname, state } - trang cần quay lại sau đăng nhập (chỉ áp dụng cho khách hàng)
  const login = (userData, jwtToken, redirectTo) => {
    loggedOutRef.current = false;
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Trả về các trang dựa vào role
    if (userData.role === 'ADMIN') navigate('/admin');
    else if (userData.role === 'HOTEL_PARTNER') navigate('/partner');
    else if (userData.role === 'OPERATIONS_MANAGER') navigate('/manager');
    else if (redirectTo?.pathname) navigate(`${redirectTo.pathname}${redirectTo.search || ''}`, { replace: true, state: redirectTo.state });
    else navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser, loggedOutRef }}>
      {children}
    </AuthContext.Provider>
  );
};
