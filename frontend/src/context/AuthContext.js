import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const response = await axios.get('http://localhost:9999/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('token', jwtToken);

    // Trả về các trang dựa vào role
    if (userData.role === 'ADMIN') navigate('/admin');
    else if (userData.role === 'PARTNER') navigate('/partner');
    else if (userData.role === 'STAFF') navigate('/manager'); 
    else navigate('/');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
