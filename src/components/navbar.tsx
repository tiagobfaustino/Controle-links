import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Users,
  LogOut,
  ChevronDown,
  Shield,
  LogIn,
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
          : "text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role ?? "";
  const isAdmin = role === "ADMIN";
  const isGestorOrAdmin = role === "ADMIN" || role === "GESTOR";
  const displayName = user?.nomeFuncional || user?.name || "";

  const navLinks = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="size-4" />,
      label: "Dashboard",
      show: true,
    },
    {
      href: "/demandas",
      icon: <ClipboardList className="size-4" />,
      label: "Demandas",
      show: isGestorOrAdmin,
    },
    {
      href: "/usuarios",
      icon: <Users className="size-4" />,
      label: "Usuários",
      show: isAdmin,
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
          <span className="flex size-9 items-center justify-center rounded-md border border-accent/70 bg-accent text-accent-foreground">
            <Shield className="size-5" />
          </span>
          <span className="leading-none">
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-accent">
              CEFS 2026 - Turma P
            </span>
            <span className="block text-sm uppercase tracking-[0.08em]">
              Controle de Links
            </span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={pathname === link.href || pathname.startsWith(link.href + "/")}
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex ml-auto">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-md border border-primary-foreground/20 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-primary-foreground/10 focus:outline-none">
                    <span className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-black text-accent-foreground">
                      {initials}
                    </span>
                    <span className="max-w-[140px] truncate">{displayName}</span>
                    <ChevronDown className="size-3.5 text-primary-foreground/70" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={logout}
                >
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" className="border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
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
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
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
                active={pathname === link.href || pathname.startsWith(link.href + "/")}
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
                  <span className="text-xs text-primary-foreground/60">{user.email}</span>
                </div>
              </div>
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
              <Button asChild variant="outline" className="w-full border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <LogIn className="size-4" />
                  Entrar
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
