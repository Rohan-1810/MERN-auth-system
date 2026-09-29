import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer token to Authorization header if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject({ ...error, customMessage: message });
  }
);

// Authentication API methods
export const registerUser = (userData) => api.post('/auth/register', userData);
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const verifyEmailToken = (token) => api.get(`/auth/verify-email/${token}`);
export const resendVerificationEmail = (email) => api.post('/auth/resend-verification', { email });
export const forgotPasswordRequest = (email) => api.post('/auth/forgot-password', { email });
export const resetPasswordRequest = (token, passwords) => api.post(`/auth/reset-password/${token}`, passwords);
export const getMe = () => api.get('/auth/me');

export default api;
