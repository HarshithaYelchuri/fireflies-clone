import { Suspense } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";

/** The signed-in product: dashboard, meetings, tasks, settings. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </Suspense>
  );
}
