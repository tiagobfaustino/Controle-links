import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { RequireAuth } from "@/components/require-auth";
import LoginPage from "@/routes/login";
import AlterarSenhaPage from "@/routes/alterar-senha";
import DashboardPage from "@/routes/dashboard";
import DemandasPage from "@/routes/demandas/index";
import NovaDemandaPage from "@/routes/demandas/nova";
import EditarDemandaPage from "@/routes/demandas/edit";
import UsuariosPage from "@/routes/usuarios/index";
import NovoUsuarioPage from "@/routes/usuarios/novo";

function NavbarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/alterar-senha"
        element={
          <RequireAuth>
            <AlterarSenhaPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <NavbarLayout>
            <DashboardPage />
          </NavbarLayout>
        }
      />
      <Route
        path="/demandas"
        element={
          <RequireAuth>
            <NavbarLayout>
              <DemandasPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/demandas/nova"
        element={
          <RequireAuth>
            <NavbarLayout>
              <NovaDemandaPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/demandas/:id"
        element={
          <RequireAuth>
            <NavbarLayout>
              <EditarDemandaPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RequireAuth adminOnly>
            <NavbarLayout>
              <UsuariosPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/usuarios/novo"
        element={
          <RequireAuth adminOnly>
            <NavbarLayout>
              <NovoUsuarioPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
