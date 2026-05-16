import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

type RequireAuthProps = {
  children: React.ReactNode;
  /** Se true, exige role=ADMIN para liberar acesso. */
  adminOnly?: boolean;
};

/**
 * Guard de rota: redireciona para /login se não autenticado.
 * Se o usuário ainda tem firstLogin=true, força /alterar-senha.
 * Se adminOnly=true e role != ADMIN, manda para /dashboard.
 */
export function RequireAuth({ children, adminOnly = false }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.firstLogin && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
