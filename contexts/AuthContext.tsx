"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

type User = {
  username: string;
  branch: string;
  branchName: string;
  branchType: string;
  branchLocation: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const res = await fetch('/api/auth/verify');
        if (res.ok) {
          const data = await res.json();
          setUser({
            username: data.user.username,
            branch: data.user.branch,
            branchName: data.user.branchName || 'Unknown Branch',
            branchType: data.user.branchType || 'Unknown',
            branchLocation: data.user.branchLocation || 'Unknown Location'
          });
        }
      } catch (error) {
        console.error("Failed to fetch user session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (!res.ok) {
      throw new Error('Invalid credentials');
    }
    
    const data = await res.json();
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}