import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { authService } from "@/services";
import { setAuthToken } from "@/services/api";
import type { Role, User } from "@/services/types";

/**
 * Authentication/authorization layer.
 *
 * The session is the single source of truth for the user's role — nothing in the
 * UI assumes a role. Today the session is restored from the auth service (or a
 * locally persisted session token placeholder); once the real auth API is
 * connected, `authService` calls resolve with the backend user and this layer
 * needs no changes.
 */

const SESSION_KEY = "teachai.session";

interface StoredSession {
  user: User;
  token: string | null;
}

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

interface AuthContextValue extends AuthState {
  signIn: (input: { email: string; password: string; remember: boolean }) => Promise<User>;
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  signOut: () => void;
  updateProfile: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(user: User | null, token: string | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token } satisfies StoredSession));
  else window.localStorage.removeItem(SESSION_KEY);
}

function readPersisted(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession | User;
    // Discard sessions created by the previous offline fallback.
    if (!('user' in parsed) || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });

  useEffect(() => {
    let active = true;
    void (async () => {
      const persisted = readPersisted();
      if (persisted?.token) setAuthToken(persisted.token);
      const remote = await authService.session().catch(() => null);
      const user = remote ?? persisted?.user ?? null;
      if (!active) return;
      setState({ user, status: user ? "authenticated" : "unauthenticated" });
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (input) => {
    const result = await authService.login(input);
    setAuthToken(result.token);
    const user = result.user;
    persist(user, result.token);
    setState({ user, status: "authenticated" });
    return user;
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (input) => {
    const result = await authService.register(input);
    setAuthToken(result.token);
    const user = result.user;
    persist(user, result.token);
    setState({ user, status: "authenticated" });
    return user;
  }, []);

  const signOut = useCallback(() => {
    void authService.logout().catch(() => null);
    setAuthToken(null);
    persist(null, null);
    setState({ user: null, status: "unauthenticated" });
  }, []);

  const updateProfile = useCallback((patch: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const user = { ...prev.user, ...patch };
      persist(user, readPersisted()?.token ?? null);
      return { ...prev, user };
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signUp, signOut, updateProfile }),
    [state, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function dashboardPath(role: Role) {
  return role === "faculty" ? "/faculty" : "/student";
}

/** Route protection: gates a whole subtree on authentication + role. */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (user.role !== role) {
      void navigate({ to: dashboardPath(user.role), replace: true });
    }
  }, [status, user, role, navigate]);

  if (status === "loading" || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
