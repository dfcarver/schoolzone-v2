"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AuthSession,
  CREDENTIALS,
  SESSION_KEY,
  SESSION_COOKIE,
  PUBLIC_ROUTES,
  isAuthorizedForPath,
  getDefaultRoute,
} from "./types";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string; redirect?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  login: () => ({ success: false }),
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function setCookie(session: AuthSession) {
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))};path=/;samesite=lax;max-age=86400`;
}

function clearCookie() {
  document.cookie = `${SESSION_COOKIE}=;path=/;max-age=0`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed: AuthSession = JSON.parse(stored);
        setSession(parsed);
        setCookie(parsed);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      clearCookie();
    }
    setLoading(false);
  }, []);

  // Client-side route guard
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (isPublic) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!isAuthorizedForPath(session.role, pathname)) {
      router.replace(getDefaultRoute(session.role));
    }
  }, [loading, session, pathname, router]);

  const login = useCallback((username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();
    const cred = CREDENTIALS[trimmed];

    if (!cred || cred.password !== password) {
      return { success: false, error: "Invalid credentials" };
    }

    const newSession: AuthSession = {
      username: trimmed,
      role: cred.role,
      authenticated_at: new Date().toISOString(),
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setCookie(newSession);
    setSession(newSession);

    return { success: true, redirect: cred.default_route };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    clearCookie();
    setSession(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
