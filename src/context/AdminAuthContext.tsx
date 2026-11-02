import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminLogin as apiLogin, adminGetMe } from "../services/api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const TOKEN_KEY = "voltix_admin_token";
const USER_KEY = "voltix_admin_user";

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY);
  });

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Validate token with backend on mount
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await adminGetMe(storedToken);
        if (res.success && res.admin) {
          setAdmin(res.admin);
          localStorage.setItem(USER_KEY, JSON.stringify(res.admin));
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn("[AdminAuth] Verify session error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, [logout]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiLogin(email, pass);
      if (res.success && res.token && res.admin) {
        setToken(res.token);
        setAdmin(res.admin);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.admin));
        return { success: true };
      }
      return { success: false, message: res.message || "Invalid credentials" };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to communicate with auth server" };
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}

