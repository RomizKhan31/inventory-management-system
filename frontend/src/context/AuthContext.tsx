'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, AuthContextType, LoginResponseData } from '../types/auth';
import { ApiResponse } from '../types/api';
import { api, getToken, setToken, removeToken } from '../lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const existingToken = getToken();
      if (!existingToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<ApiResponse<User>>('/auth/me');
        if (isMounted) {
          if (response.success && response.data) {
            setUser(response.data);
            setTokenState(existingToken);
          } else {
            removeToken();
            setUser(null);
            setTokenState(null);
          }
        }
      } catch {
        if (isMounted) {
          removeToken();
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Explicit refreshUser function callable by components
  const refreshUser = useCallback(async () => {
    const existingToken = getToken();
    if (!existingToken) {
      setUser(null);
      setTokenState(null);
      return;
    }

    try {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      if (response.success && response.data) {
        setUser(response.data);
        setTokenState(existingToken);
      } else {
        removeToken();
        setUser(null);
        setTokenState(null);
      }
    } catch {
      removeToken();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  // Login handler
  const login = async (identifier: string, password: string): Promise<User> => {
    const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', {
      identifier,
      password,
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }

    const { token: receivedToken, user: receivedUser } = response.data;
    setToken(receivedToken);
    setTokenState(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout API call failed:', err);
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
  };

  // Change password handler
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    const response = await api.post<ApiResponse<void>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to change password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
