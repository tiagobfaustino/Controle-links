import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { RequireAuth } from "@/components/require-auth";
import { NotificationsWatcher } from "@/components/notifications-watcher";
import LoginPage from "@/routes/login";
import AlterarSenhaPage from "@/routes/alterar-senha";
import RecuperarSenhaPage from "@/routes/recuperar-senha/index";
import ConfirmarRecuperacaoPage from "@/routes/recuperar-senha/confirmar";
import DashboardPage from "@/routes/dashboard";
import DemandasPage from "@/routes/demandas/index";
import NovaDemandaPage from "@/routes/demandas/nova";
import EditarDemandaPage from "@/routes/demandas/edit";
import HistoricoDemandaPage from "@/routes/demandas/historico";
import CalendarioDemandasPage from "@/routes/demandas/calendario";
import LembretesPage from "@/routes/lembretes";
import MinhasPendenciasPage from "@/routes/minhas-pendencias";
import SobrePage from "@/routes/sobre";
import PerfilPage from "@/routes/perfil";
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
    <>
      <NotificationsWatcher />
      <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      <Route
        path="/recuperar-senha/confirmar/:token"
        element={<ConfirmarRecuperacaoPage />}
      />
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
        path="/sobre"
        element={
          <NavbarLayout>
            <SobrePage />
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
        path="/demandas/calendario"
        element={
          <RequireAuth>
            <NavbarLayout>
              <CalendarioDemandasPage />
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
        path="/demandas/:id/historico"
        element={
          <RequireAuth>
            <NavbarLayout>
              <HistoricoDemandaPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/lembretes"
        element={
          <RequireAuth>
            <NavbarLayout>
              <LembretesPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/minhas-pendencias"
        element={
          <RequireAuth>
            <NavbarLayout>
              <MinhasPendenciasPage />
            </NavbarLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/perfil"
        element={
          <RequireAuth>
            <NavbarLayout>
              <PerfilPage />
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
    </>
  );
}
