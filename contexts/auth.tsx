"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { getPb } from "@/lib/pocketbase";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "GESTOR" | "PARTICIPANTE";
  firstLogin: boolean;
  participante: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function modelToUser(model: Record<string, unknown> | null): AuthUser | null {
    if (!model) return null;
    return {
      id: model.id as string,
      email: model.email as string,
      name: (model.name as string) ?? "",
      role: (model.role as "ADMIN" | "GESTOR" | "PARTICIPANTE") ?? "PARTICIPANTE",
      firstLogin: Boolean(model.firstLogin),
      participante: (model.participante as string) ?? "",
    };
  }

  const syncUser = useCallback(() => {
    const pb = getPb();
    if (pb.authStore.isValid && pb.authStore.model) {
      setUser(modelToUser(pb.authStore.model as Record<string, unknown>));
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const pb = getPb();
    // Load token from cookie on mount
    pb.authStore.loadFromCookie(document.cookie);
    syncUser();
    setLoading(false);

    // Keep state in sync with auth store changes
    const unsub = pb.authStore.onChange(() => {
      syncUser();
    });

    return () => {
      unsub();
    };
  }, [syncUser]);

  async function login(email: string, password: string) {
    const pb = getPb();
    await pb.collection("users").authWithPassword(email, password);
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
    syncUser();
  }

  function logout() {
    const pb = getPb();
    pb.authStore.clear();
    // Clear the pb_auth cookie by expiring it
    document.cookie =
      "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
