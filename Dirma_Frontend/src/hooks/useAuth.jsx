import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

/**
 * Contexte d'authentification DIRMA.
 * Fournit l'utilisateur connecté et les fonctions login/logout à toute l'app.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session au chargement
  useEffect(() => {
    const token = localStorage.getItem('dirma_token');
    if (!token) { setLoading(false); return; }

    authApi.profil()
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('dirma_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifiant, password) => {
    const data = await authApi.login(identifiant, password);
    localStorage.setItem('dirma_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('dirma_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
