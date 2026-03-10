"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  branchId?: string;
  branch?: { id: string; name: string; code: string };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem("auth_user");
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // Cache valid for 5 minutes
    if (Date.now() - cached.ts > 5 * 60 * 1000) return null;
    return cached.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedUser = typeof window !== "undefined" ? getCachedUser() : null;
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        try {
          sessionStorage.setItem("auth_user", JSON.stringify({ ts: Date.now(), user: data.user }));
        } catch { /* ignore */ }
      } else {
        setUser(null);
        sessionStorage.removeItem("auth_user");
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setUser(data.user);
    router.push("/dashboard");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("dashboard_cache");
    router.push("/login");
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
