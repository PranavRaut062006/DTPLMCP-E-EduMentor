import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  User as UserIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full accent-gradient-bg" />
            ) : null}
            <item.icon
              className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary" : "opacity-80")}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  items,
  children,
  roleLabel,
}: {
  items: NavItem[];
  children: React.ReactNode;
  roleLabel: string;
}) {
  const { user, signOut } = useAuth();
  const isStudent = user?.role === "student";
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/">
          <Logo size="sm" />
        </Link>
        <button
          type="button"
          aria-label="Close navigation"
          className="text-muted-foreground lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      <div className="mx-5 mb-4 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{roleLabel}</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Turn your syllabus into intelligent learning.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[272px] border-r border-sidebar-border">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search classrooms, materials, topics…"
              className="h-10 pl-9"
              aria-label="Search"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 transition-colors hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-elevated text-xs text-primary">
                      {user ? initials(user.fullName) : "—"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                    {user?.fullName}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user?.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={isStudent ? "/student/profile" : "/faculty/profile"}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={isStudent ? "/student/settings" : "/faculty/settings"}>
                    <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
