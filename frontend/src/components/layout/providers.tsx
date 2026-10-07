"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ComingSoonProvider } from "@/components/common/coming-soon";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";


export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <ComingSoonProvider>
        <AuthProvider>{children}</AuthProvider>
        <Toaster theme="light" position="bottom-right" offset={{ bottom: 96 }} mobileOffset={{ bottom: 96 }} richColors closeButton />
      </ComingSoonProvider>
    </TooltipProvider>
  );
}
