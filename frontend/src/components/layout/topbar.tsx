"use client";

import { Bell, CircleHelp, LogOut, Menu, Mic, Search, Settings, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { useComingSoon } from "@/components/common/coming-soon";
import { ParticipantAvatar } from "@/components/common/participant-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface TopbarProps {
  onOpenMenu: () => void;
  /** Register the Ctrl/⌘ K shortcut (off for non-interactive renders such as the landing preview). */
  shortcuts?: boolean;
}

export function Topbar({ onOpenMenu, shortcuts = true }: TopbarProps) {
  const router = useRouter();
  const showComingSoon = useComingSoon();
  const { user: profile, logout } = useAuth();
  const avatar = { id: 0, name: profile?.name ?? "" };
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/⌘ + K focuses global search, like the Fireflies app.
  useEffect(() => {
    if (!shortcuts) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/meetings?q=${encodeURIComponent(q)}` : "/meetings");
    inputRef.current?.blur();
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={submit} className="relative w-full max-w-md" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all your meetings"
          aria-label="Search meetings"
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pr-14 pl-9 text-sm text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-gray-500 sm:block">
          Ctrl K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          className="hidden h-9 gap-1.5 px-3 text-gray-700 lg:inline-flex"
          onClick={() => showComingSoon("team")}
        >
          <UserPlus className="size-4" /> Invite
        </Button>
        <Button
          className="h-9 gap-1.5 bg-gradient-to-r from-brand-600 to-brand-500 px-3 shadow-xs hover:opacity-90"
          onClick={() => showComingSoon("capture")}
        >
          <Mic className="size-4" />
          <span className="hidden sm:inline">Capture</span>
        </Button>
        <button
          onClick={() => showComingSoon("notifications")}
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-pink ring-2 ring-white" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
          >
            <ParticipantAvatar participant={avatar} size="md" className="bg-brand-500 text-white" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2">
                <ParticipantAvatar participant={avatar} size="lg" className="bg-brand-500 text-white" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{profile?.name}</span>
                  <span className="block truncate text-xs font-normal text-gray-500">{profile?.email}</span>
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings?tab=profile" />}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("team")}>
              <UserPlus /> Invite teammates
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("askfred")}>
              <CircleHelp /> Help center
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout(); // the app's route guard then returns to the landing page
                toast.success("You've been signed out");
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
