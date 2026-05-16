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
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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

  const initials = user?.name
    ? (user.name as string)
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link
          to="/dashboard"
          className="mr-2 flex items-center gap-2 font-bold text-foreground"
        >
          Controle de Links
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
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus:outline-none">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </span>
                    <span className="max-w-[140px] truncate">{user.name}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{user.name}</span>
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
          )}
        </div>

        <div className="ml-auto flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background px-4 pb-4 md:hidden">
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

          {user && (
            <div className="mt-3 border-t pt-3">
              <div className="mb-2 flex items-center gap-3 px-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initials}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
