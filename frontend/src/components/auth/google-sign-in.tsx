"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";

/** Minimal typing for Google Identity Services (https://developers.google.com/identity/gsi/web). */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

interface GoogleSignInProps {
  mode: "signin" | "signup";
  /** Receives the Google ID token to exchange with the API. */
  onCredential: (credential: string) => void;
}

/**
 * "Continue with Google". Renders Google's official button when the API reports a client ID
 * (GOOGLE_CLIENT_ID on the backend); otherwise a look-alike that explains it isn't set up.
 */
export function GoogleSignIn({ mode, onCredential }: GoogleSignInProps) {
  const { data: config } = useResource("auth:config", api.auth.config);
  const clientId = config?.google_client_id;
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Google keeps the callback it was initialized with; route it to the latest handler.
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });
  const label = mode === "signup" ? "Sign up with Google" : "Continue with Google";

  const render = useCallback(() => {
    const google = window.google;
    if (!google || !clientId || !container.current) return;
    google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => onCredentialRef.current(credential), ux_mode: "popup" });
    google.accounts.id.renderButton(container.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: mode === "signup" ? "signup_with" : "continue_with",
      width: Math.min(400, container.current.offsetWidth || 360),
    });
    setReady(true);
  }, [clientId, mode]);

  if (clientId) {
    return (
      <>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} />
        <div ref={container} className="flex min-h-11 w-full justify-center" aria-label={label} />
        {!ready && <div className="-mt-11 h-11 w-full animate-pulse rounded-full bg-gray-100" />}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        toast.info("Google sign-in isn't set up on this server", {
          description: "Set GOOGLE_CLIENT_ID on the backend to enable it (see README). You can use email or the demo account meanwhile.",
        })
      }
      className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none"
    >
      <GoogleLogo /> {label}
    </button>
  );
}
