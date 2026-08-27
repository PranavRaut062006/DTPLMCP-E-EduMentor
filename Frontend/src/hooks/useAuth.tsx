import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppRole } from "@/lib/types";

export type User = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

type AuthState = {
  user: User | null;
  role: AppRole | null;
  name: string;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setToken: (token: string) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const token = localStorage.getItem("teachai_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("teachai_token");
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const value: AuthState = {
    user,
    role: user?.role ?? null,
    name: user?.name ?? "",
    loading,
    signOut: async () => {
      localStorage.removeItem("teachai_token");
      setUser(null);
    },
    refresh: loadProfile,
    setToken: (token: string) => {
      localStorage.setItem("teachai_token", token);
      loadProfile();
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
