import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
