"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, getAuthToken, setAuthToken, setUnauthorizedHandler } from "@/lib/api";
import type { AuthResponse, Profile, ProfileInput, SignupInput } from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** The signed-in user; null while loading or when signed out. */
  user: Profile | null;
  /** True after an explicit sign-out (as opposed to an expired session), so guards can go home instead of to /login. */
  signedOut: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  signup: (input: SignupInput) => Promise<Profile>;
  loginWithGoogle: (credential: string) => Promise<Profile>;
  logout: () => Promise<void>;
  /** Persist profile/preference changes for the signed-in user. */
  saveProfile: (input: ProfileInput) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: Profile | null; signedOut: boolean }>({
    status: "loading",
    user: null,
    signedOut: false,
  });

  // Restore the session from a stored token, and drop it whenever the API rejects it.
  useEffect(() => {
    const signOutLocally = () => {
      setAuthToken(null);
      setState({ status: "unauthenticated", user: null, signedOut: false });
    };
    setUnauthorizedHandler(signOutLocally);
    (getAuthToken() ? api.auth.me() : Promise.reject(new Error("no session"))).then(
      (user) => setState({ status: "authenticated", user, signedOut: false }),
      signOutLocally,
    );
    return () => setUnauthorizedHandler(null);
  }, []);

  const start = useCallback(async (pending: Promise<AuthResponse>) => {
    const { token, user } = await pending;
    setAuthToken(token);
    setState({ status: "authenticated", user, signedOut: false });
    return user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (email, password) => start(api.auth.login(email, password)),
      signup: (input) => start(api.auth.signup(input)),
      loginWithGoogle: (credential) => start(api.auth.google(credential)),
      logout: async () => {
        await api.auth.logout().catch(() => undefined); // signing out locally must work even offline
        setAuthToken(null);
        setState({ status: "unauthenticated", user: null, signedOut: true });
      },
      saveProfile: async (input) => {
        const user = await api.profile.update(input);
        setState({ status: "authenticated", user, signedOut: false });
        return user;
      },
    }),
    [state, start],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
