import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Injecter le token Sanctum dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dirma_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rediriger vers /login si token expiré
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dirma_token');
      localStorage.removeItem('dirma_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
