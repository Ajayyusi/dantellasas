"use client";

import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getClientAuth } from "@/lib/firebase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Call after any successful Firebase sign-in to mint the server session. */
  establishSession: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onIdTokenChanged(getClientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const establishSession = useCallback(async (u: User) => {
    const idToken = await u.getIdToken(true);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Failed to establish session");
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await fbSignOut(getClientAuth());
  }, []);

  const value = useMemo(
    () => ({ user, loading, establishSession, signOut }),
    [user, loading, establishSession, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
