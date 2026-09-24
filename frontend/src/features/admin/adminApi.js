import axios from 'axios';

const API_URL = 'http://localhost:9999/api/admin';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getUsers = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/users`, {
    headers: getHeaders(),
    params: filters,
  });
  return response.data;
};

export const updateUser = async (userId, changes) => {
  const response = await axios.patch(`${API_URL}/users/${userId}`, changes, {
    headers: getHeaders(),
  });
  return response.data;
};
