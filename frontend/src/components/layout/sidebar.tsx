"use client";

import { ChevronsLeft, ChevronsRight, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useComingSoon } from "@/components/common/coming-soon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from "./nav-items";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  /** Highlight this nav item instead of the current route (used by the landing-page preview). */
  activeHref?: string;
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  activeHref?: string;
}

function NavLink({ item, collapsed, onNavigate, activeHref }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(activeHref ?? pathname, item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-brand-600" : "text-gray-500 group-hover:text-gray-700")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && (
            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-500">Soon</span>
          )}
        </>
      )}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ collapsed, onToggleCollapsed, onNavigate, activeHref }: SidebarProps) {
  const showComingSoon = useComingSoon();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-white transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="Hersheys.ai dashboard">
          <Logo collapsed={collapsed} />
        </Link>
        {!collapsed && (
          <button
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
            className="hidden rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:block"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="hidden px-3 pb-1 md:block">
          <Tooltip>
            <TooltipTrigger
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              className="flex h-9 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
            >
              <ChevronsRight className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} activeHref={activeHref} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t px-3 py-3">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} activeHref={activeHref} />
        ))}

        {!collapsed && (
          <div className="mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-pink-50 p-3.5 ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-gray-900">You&apos;re on the Free plan</p>
            <p className="mt-0.5 text-xs text-gray-600">Unlock unlimited transcription, AI summaries and more.</p>
            <button
              onClick={() => showComingSoon("billing")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
            >
              <Zap className="size-3.5 fill-current" /> Upgrade
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
