import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { getPb } from "@/lib/pocketbase";
import { loadAuthFromCookie } from "@/lib/auth-cookie";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  nomeFuncional: string;
  role: "ADMIN" | "GESTOR";
  firstLogin: boolean;
  celular: string;
  numeroCurso: number | null;
  numPM: number | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function sameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  return (
    a?.id === b?.id &&
    a?.email === b?.email &&
    a?.name === b?.name &&
    a?.nomeFuncional === b?.nomeFuncional &&
    a?.role === b?.role &&
    a?.firstLogin === b?.firstLogin &&
    a?.celular === b?.celular &&
    a?.numeroCurso === b?.numeroCurso &&
    a?.numPM === b?.numPM
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function modelToUser(model: Record<string, unknown> | null): AuthUser | null {
    if (!model) return null;
    return {
      id: model.id as string,
      email: model.email as string,
      name: (model.name as string) ?? "",
      nomeFuncional: (model.nomeFuncional as string) ?? "",
      role: (model.role as "ADMIN" | "GESTOR") ?? "GESTOR",
      firstLogin: Boolean(model.firstLogin),
      celular: (model.celular as string) ?? "",
      numeroCurso: typeof model.numeroCurso === "number" ? model.numeroCurso : null,
      numPM: typeof model.numPM === "number" ? model.numPM : null,
    };
  }

  const syncUser = useCallback(() => {
    const pb = getPb();
    const next =
      pb.authStore.isValid && pb.authStore.model
        ? modelToUser(pb.authStore.model as Record<string, unknown>)
        : null;

    setUser((prev) => (sameUser(prev, next) ? prev : next));
  }, []);

  useEffect(() => {
    const pb = loadAuthFromCookie();
    syncUser();
    setLoading(false);

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
    document.cookie =
      "pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    setUser(null);
    navigate("/dashboard");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
