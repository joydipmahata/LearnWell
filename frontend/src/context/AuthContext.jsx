import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('learnwell_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('learnwell_token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('learnwell_theme') || 'dark');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('learnwell_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const login = async (userId, pin) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, pin }),
      });
      localStorage.setItem('learnwell_token', data.access_token);
      localStorage.setItem('learnwell_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('learnwell_token');
    localStorage.removeItem('learnwell_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, theme, toggleTheme, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
