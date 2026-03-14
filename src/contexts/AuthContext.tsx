import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { user } = await api.getMe();
          setUser(user);
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    // Determine the source of truth for the theme
    const savedTheme = localStorage.getItem('theme');
    const userPref = user?.darkMode;
    
    let isDark = false;
    if (userPref !== undefined && userPref !== null) {
      // User is logged in and has a preference
      isDark = userPref === true || (userPref as any) === 1 || (userPref as any) === '1';
    } else if (savedTheme) {
      isDark = savedTheme === 'dark';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [user?.darkMode, user]);

  const applyTheme = (isDark: boolean) => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    const isDark = userData.darkMode === true || (userData.darkMode as any) === 1 || (userData.darkMode as any) === '1';
    applyTheme(isDark);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('theme');
    // On logout, fallback to system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(isDark);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updates };
      if (updates.darkMode !== undefined) {
        applyTheme(updates.darkMode);
      }
      setUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
