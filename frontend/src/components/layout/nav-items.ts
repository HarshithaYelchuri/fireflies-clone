import {
  BarChart3,
  CircleCheckBig,
  Headset,
  House,
  Plug,
  Settings,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

/** Mirrors the Fireflies web-app sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/askfred", label: "AskFred", icon: Sparkles, soon: true },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/tasks", label: "Tasks", icon: CircleCheckBig },
  { href: "/uploads", label: "Uploads", icon: Upload, soon: true },
  { href: "/ai-skills", label: "AI Skills", icon: WandSparkles, soon: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, soon: true },
  { href: "/voice-agents", label: "Voice Agents", icon: Headset, soon: true },
  { href: "/integrations", label: "Integrations", icon: Plug, soon: true },
];

export const SECONDARY_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
