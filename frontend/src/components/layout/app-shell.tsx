"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Fireflies app frame: fixed left sidebar (collapsible on desktop, drawer on mobile) + top bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile drawer whenever the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-gray-900/40 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
