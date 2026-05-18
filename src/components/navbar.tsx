import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PwaInstall } from "@/components/pwa-install";
import { NotificationsToggle } from "@/components/notifications-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Info,
  Users,
  UserRound,
  LogOut,
  ChevronDown,
  LogIn,
  Bell,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavLink({ href, icon, label, active, onClick }: NavLinkProps) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold uppercase tracking-[0.04em] transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function toText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { turmas, selectedTurma, selectTurma } = useTurma();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const turmasAtivas = turmas.filter((t) => t.ativa);
  const showTurmaSelector = turmas.length > 1 && user?.role === "ADMIN";

  const role = user?.role ?? "";
  const isAdmin = role === "ADMIN";
  const isGestorOrAdmin = role === "ADMIN" || role === "GESTOR";
  const displayName = toText(user?.nomeFuncional) || toText(user?.name);

  const navLinks = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="size-4" />,
      label: "Dashboard",
      show: true,
    },
    {
      href: "/minhas-pendencias",
      icon: <ClipboardCheck className="size-4" />,
      label: "Minhas",
      show: !!user,
    },
    {
      href: "/demandas",
      icon: <ClipboardList className="size-4" />,
      label: "Demandas",
      show: isGestorOrAdmin,
    },
    {
      href: "/lembretes",
      icon: <Bell className="size-4" />,
      label: "Lembretes",
      show: isGestorOrAdmin,
    },
    {
      href: "/usuarios",
      icon: <Users className="size-4" />,
      label: "Alunos",
      show: isAdmin,
    },
    {
      href: "/sobre",
      icon: <Info className="size-4" />,
      label: "Sobre",
      show: true,
    },
  ].filter((l) => l.show);

  const initials = displayName
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-primary/70 bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link
          to="/dashboard"
          className="mr-2 flex items-center gap-3 font-bold text-primary-foreground"
        >
          <img
            src="/android-chrome-192x192.png"
            alt=""
            className="size-9 rounded-md border border-accent/70 object-cover shadow-sm"
          />
          <span className="leading-none">
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-accent">
              Controle de Links
            </span>
            <span className="block text-sm uppercase tracking-[0.08em]">
              {selectedTurma?.nome ?? "CEFS 2026 - Turma P"}
            </span>
          </span>
        </Link>

        {showTurmaSelector && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="hidden items-center gap-1.5 rounded-md border border-primary-foreground/20 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.04em] text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 md:inline-flex"
                  title="Trocar turma"
                >
                  {selectedTurma?.sigla ?? "Turma"}
                  <ChevronDown className="size-3 text-primary-foreground/60" />
                </button>
              }
            />
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuLabel>
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Selecionar turma
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {turmasAtivas.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => selectTurma(t.id)}
                  className={
                    t.id === selectedTurma?.id ? "bg-accent/30 font-bold" : ""
                  }
                >
                  {t.nome}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={
                pathname === link.href || pathname.startsWith(link.href + "/")
              }
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex ml-auto">
          {user && <NotificationsToggle />}
          <PwaInstall />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-md border border-primary-foreground/20 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-primary-foreground/10 focus:outline-none">
                    <span className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-black text-accent-foreground">
                      {initials}
                    </span>
                    <span className="hidden lg:inline max-w-[140px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="size-3.5 text-primary-foreground/70" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/perfil")}>
                  <UserRound className="size-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="outline"
              className="border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/login">
                <LogIn className="size-4" />
                Entrar
              </Link>
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-primary-foreground/15 bg-primary px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                active={
                  pathname === link.href || pathname.startsWith(link.href + "/")
                }
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>

          {user ? (
            <div className="mt-3 border-t pt-3">
              <div className="mb-2 flex items-center gap-3 px-3">
                <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-sm font-bold text-accent-foreground">
                  {initials}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-primary-foreground/60">
                    {user.email}
                  </span>
                </div>
              </div>
              <Link
                to="/perfil"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-bold uppercase tracking-[0.04em] text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                <UserRound className="size-4" />
                Meu perfil
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-bold uppercase tracking-[0.04em] text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </div>
          ) : (
            <div className="mt-3 border-t border-primary-foreground/15 pt-3">
              <Button
                asChild
                variant="outline"
                className="w-full border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <LogIn className="size-4" />
                  Entrar
                </Link>
              </Button>
            </div>
          )}
          <div className="mt-3 border-t border-primary-foreground/15 pt-3">
            {user && <NotificationsToggle />}
          <PwaInstall />
          </div>
        </div>
      )}
    </nav>
  );
}
