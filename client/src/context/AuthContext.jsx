import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('customcliq_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('customcliq_access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('customcliq_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('customcliq_access_token', data.accessToken);
      localStorage.setItem('customcliq_refresh_token', data.refreshToken);
      localStorage.setItem('customcliq_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    if (data.success) {
      localStorage.setItem('customcliq_access_token', data.accessToken);
      localStorage.setItem('customcliq_refresh_token', data.refreshToken);
      localStorage.setItem('customcliq_user', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('customcliq_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('customcliq_access_token');
      localStorage.removeItem('customcliq_refresh_token');
      localStorage.removeItem('customcliq_user');
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('customcliq_user', JSON.stringify(updatedUser));
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isSuperAdmin,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
