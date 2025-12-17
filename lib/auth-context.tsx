// lib/auth-context.tsx
// React context for NextAuth authentication

import React, { createContext, useContext, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signInWithCredentials: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const user: User | null = session?.user
    ? {
        id: (session.user as { id: string }).id,
        email: session.user.email!,
        name: session.user.name,
        image: session.user.image,
      }
    : null;

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Signup failed") };
      }

      // Auto sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: new Error(result.error) };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signInWithCredentials = useCallback(async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: new Error("Invalid email or password") };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signIn("google", { callbackUrl: "/" });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signInWithCredentials,
    signOutUser,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
