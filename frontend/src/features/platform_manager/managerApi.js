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
export const getPartnerChangeRequests = (params) => api.get('/partner-change-requests', { params });
export const reviewPartnerChangeRequest = (id, data) => api.patch(`/partner-change-requests/${id}/review`, data);
export const getSupportTickets = (params) => api.get('/support-tickets', { params });
export const respondToSupportTicket = (id, data) => api.patch(`/support-tickets/${id}/respond`, data);
export const getDisputes = (params) => api.get('/disputes', { params });
export const updateDispute = (id, data) => api.patch(`/disputes/${id}`, data);
export const getRefunds = (params) => api.get('/refunds', { params });
export const reviewRefund = (id, data) => api.patch(`/refunds/${id}/review`, data);
export const getCommissionPolicies = () => api.get('/commission-policies');
export const createCommissionPolicy = (data) => api.post('/commission-policies', data);
export const updateCommissionPolicy = (id, data) => api.patch(`/commission-policies/${id}`, data);
export const getPartners = () => api.get('/partners');
export const getPayouts = (params) => api.get('/payouts', { params });
export const generatePayout = (data) => api.post('/payouts/generate', data);
export const reviewPayout = (id, data) => api.patch(`/payouts/${id}/review`, data);
export const getManagerAuditLogs = (params) => api.get('/audit-logs', { params });

