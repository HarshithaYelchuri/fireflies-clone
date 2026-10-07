"use client";

import { Eye, EyeOff, Loader2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "./auth-provider";
import { GoogleSignIn } from "./google-sign-in";

/** Seeded by the backend (backend/app/seed/data.py → DEMO_ACCOUNT). */
export const DEMO_CREDENTIALS = { email: "priya@lumenlabs.io", password: "demo1234" };

/** Only same-site paths are allowed as post-login destinations. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const { status, login, signup, loginWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const demo = !isSignup && params.get("demo") === "1";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(demo ? DEMO_CREDENTIALS.email : "");
  const [password, setPassword] = useState(demo ? DEMO_CREDENTIALS.password : "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or just signed in): continue into the app.
  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  const run = async (action: () => Promise<{ name: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const user = await action();
      toast.success(isSignup ? `Welcome to Hersheys.ai, ${user.name.split(" ")[0]}!` : `Welcome back, ${user.name.split(" ")[0]}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    run(() => (isSignup ? signup({ name: name.trim(), email: email.trim(), password }) : login(email.trim(), password)));
  };


  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {isSignup ? "Start turning meetings into momentum. Free to try." : "Sign in to your Hersheys.ai workspace."}
      </p>

      <div className="mt-8">
        <GoogleSignIn mode={mode} onCredential={(credential) => run(() => loginWithGoogle(credential))} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
        <span className="h-px flex-1 bg-gray-200" /> or with email <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={submit} className="grid gap-4">
        {isSignup && (
          <div className="grid gap-1.5">
            <Label htmlFor="auth-name">Full name</Label>
            <Input id="auth-name" required autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" placeholder="Priya Raman" />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="auth-email">Work email</Label>
          <Input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" placeholder="you@company.com" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <div className="relative">
            <Input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={isSignup ? 8 : 1}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl pr-11"
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(11,33,73,0.6)] transition hover:bg-ink-soft disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      {!isSignup && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEmail(DEMO_CREDENTIALS.email);
            setPassword(DEMO_CREDENTIALS.password);
            run(() => login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password));
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-100 bg-brand-50 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
        >
          <PlayCircle className="size-4" /> Explore with the demo account
        </button>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        {isSignup ? "Already have an account? " : "New to Hersheys.ai? "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {isSignup && (
        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-gray-600">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-600">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </div>
  );
}
