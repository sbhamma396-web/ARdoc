import axios from 'axios';

const API_URL =  'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Auto-inject token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401) {
      const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register') || requestUrl.includes('/auth/mfa') || requestUrl.includes('/auth/biometric');
      if (!isAuthRoute) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
