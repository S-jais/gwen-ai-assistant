'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse, AuthStatus } from '@/types';
import { api, getStoredToken, setStoredToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSetupCompleted: boolean;
  isAuthModalOpen: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const refreshUser = async () => {
    try {
      const activeToken = getStoredToken();
      if (!activeToken) {
        setUser(null);
        setToken(null);
        return;
      }
      setToken(activeToken);
      const currentUser = await api.getMe();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
      setToken(null);
      setStoredToken(null);
    }
  };

  const checkStatus = async () => {
    try {
      const status: AuthStatus = await api.getAuthStatus();
      setIsSetupCompleted(status.is_setup_completed);
      if (!status.is_setup_completed) {
        setIsAuthModalOpen(true);
      }
    } catch (e) {
      // Backend offline or starting
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await checkStatus();
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, []);

  const loginHandler = async (u: string, p: string) => {
    const res = await api.login(u, p);
    setUser(res.user);
    if (res.token) setToken(res.token);
    setIsAuthModalOpen(false);
    await checkStatus();
    return res;
  };

  const registerHandler = async (u: string, p: string) => {
    const res = await api.register(u, p);
    setUser(res.user);
    if (res.token) setToken(res.token);
    setIsAuthModalOpen(false);
    await checkStatus();
    return res;
  };

  const logoutHandler = async () => {
    await api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSetupCompleted,
        isAuthModalOpen,
        login: loginHandler,
        register: registerHandler,
        logout: logoutHandler,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => {
          if (isSetupCompleted) setIsAuthModalOpen(false);
        },
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
