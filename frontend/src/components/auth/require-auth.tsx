"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

import { useAuth } from "./auth-provider";

/**
 * Gate for the signed-in app. Signed-out visitors go to /login (and come back afterwards via ?next=);
 * after an explicit sign-out they go to the landing page instead.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const next = encodeURIComponent(search ? `${pathname}?${search}` : pathname);
    router.replace(signedOut ? "/" : `/login?next=${next}`);
  }, [status, signedOut, pathname, search, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="flex animate-pulse flex-col items-center gap-3 text-sm text-gray-500">
          <Logo />
          {status === "loading" ? "Loading your workspace…" : "Redirecting…"}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
