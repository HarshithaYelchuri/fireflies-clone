import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const POINTS = [
  "Searchable, speaker-labelled transcripts",
  "AI summaries, decisions and outlines",
  "Action items with owners and due dates",
];

/** Sign-in / sign-up: brand panel on the left (desktop), form on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-25 via-pink-50/60 to-sky-50 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="absolute -top-32 -left-24 size-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div aria-hidden className="absolute -right-24 -bottom-32 size-96 rounded-full bg-sky-200/50 blur-3xl" />
        <Link href="/" className="relative w-fit" aria-label="Hersheys.ai home">
          <Logo />
        </Link>
        <div className="relative mx-auto w-full max-w-md">
          <Image
            src="/brand/hersheys-logo.png"
            alt="Hersheys.ai: two teammates in a meeting"
            width={320}
            height={320}
            priority
            className="mx-auto rounded-3xl bg-white p-4 shadow-[0_30px_80px_-30px_rgba(11,33,73,0.4)]"
          />
          <ul className="mt-10 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm font-medium text-ink">
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-brand-600 shadow-xs">
                  <Check className="size-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-gray-500">© Hersheys.ai</p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="w-fit lg:hidden" aria-label="Hersheys.ai home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
