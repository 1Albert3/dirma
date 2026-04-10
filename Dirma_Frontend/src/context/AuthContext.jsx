import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem('dirma_user') || 'null'));
  const [loading, setLoading] = useState(false);

  const login = async (identifiant, password, role) => {
    const { data } = await api.post('/auth/login', { identifiant, password });
    localStorage.setItem('dirma_token', data.token);
    localStorage.setItem('dirma_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('dirma_token', data.token);
    localStorage.setItem('dirma_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('dirma_token');
    localStorage.removeItem('dirma_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
