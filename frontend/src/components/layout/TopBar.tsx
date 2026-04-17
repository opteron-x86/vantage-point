"use client";

import { Activity, BookOpen, GraduationCap, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

export function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-subtle bg-bg px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Logo size={18} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted">
            Vantage Point
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink href="/" active={pathname === "/"}>
            Dashboard
          </NavLink>
          <NavLink href="/journal" active={pathname === "/journal"}>
            <BookOpen className="mr-1 inline h-3 w-3" />
            Journal
          </NavLink>
          <NavLink href="/learn" active={pathname === "/learn"}>
            <GraduationCap className="mr-1 inline h-3 w-3" />
            Learn
          </NavLink>
          <NavLink href="/logs" active={pathname === "/logs"}>
            <Activity className="mr-1 inline h-3 w-3" />
            Usage
          </NavLink>
          <NavLink href="/settings" active={pathname === "/settings"}>
            <Settings className="mr-1 inline h-3 w-3" />
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <span className="font-mono text-xs text-fg-subtle">
            {user.username}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label="Log out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Log out</span>
        </Button>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: Route;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "text-fg"
          : "text-fg-subtle hover:bg-surface-muted hover:text-fg-muted",
      )}
    >
      {children}
    </Link>
  );
}
