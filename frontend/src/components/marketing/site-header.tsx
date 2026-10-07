"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export const SITE_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
];

/** Primary call to action, shared by the header, hero and closing section. */
export function GetStartedLink({ className, children = "Get Started" }: { className?: string; children?: React.ReactNode }) {
  return (
    <Link
      href="/signup"
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(11,33,73,0.55)] transition hover:bg-ink-soft focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SiteHeader() {
  const { status } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signedIn = status === "authenticated";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open ? "border-b border-gray-200/70 bg-white/85 shadow-[0_1px_0_rgba(16,24,40,0.02)] backdrop-blur-lg" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Link href="/" aria-label="Hersheys.ai home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/80 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {signedIn ? (
            <GetStartedLink className="h-10">Open dashboard</GetStartedLink>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gray-100/80">
                Sign In
              </Link>
              <GetStartedLink className="h-10" />
            </>
          )}
        </div>

        <button
          className="ml-auto rounded-lg p-2 text-ink hover:bg-gray-100 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gray-100 px-4 pt-2 pb-5 md:hidden">
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 grid gap-2">
            {!signedIn && (
              <Link href="/login" className="rounded-full border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-ink">
                Sign In
              </Link>
            )}
            <GetStartedLink className="h-11">{signedIn ? "Open dashboard" : "Get Started"}</GetStartedLink>
          </div>
        </div>
      )}
    </header>
  );
}
