import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:9999/api/manager' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getManagerDashboard = () => api.get('/dashboard');
export const getVerifications = (params) => api.get('/verifications', { params });
export const reviewVerification = (id, data) => api.patch(`/verifications/${id}/review`, data);
export const getDisputes = (params) => api.get('/disputes', { params });
export const updateDispute = (id, data) => api.patch(`/disputes/${id}`, data);
export const getRefunds = (params) => api.get('/refunds', { params });
export const reviewRefund = (id, data) => api.patch(`/refunds/${id}/review`, data);
