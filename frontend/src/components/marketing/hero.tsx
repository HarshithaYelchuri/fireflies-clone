import { PlayCircle } from "lucide-react";
import Link from "next/link";

import { HeroVisual } from "./hero-visual";
import { GetStartedLink } from "./site-header";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand glow + a faint grid, fading out towards the edges */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-[-10%] size-[640px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute top-40 right-[20%] size-[360px] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute top-10 left-[-10%] size-[420px] rounded-full bg-pink-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(11,33,73,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(11,33,73,0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] bg-[size:56px_56px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-24">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-xs backdrop-blur">
            <span className="size-1.5 rounded-full bg-brand-coral" />
            AI meeting intelligence
          </p>
          <h1 className="mt-6 text-[2.75rem] leading-[1.05] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
            Turn Every Meeting Into{" "}
            <span className="bg-gradient-to-r from-brand-600 via-brand-magenta to-brand-coral bg-clip-text text-transparent">
              Momentum.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            AI-powered meeting intelligence that captures conversations, understands decisions, and turns them into actionable work.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <GetStartedLink className="h-12 px-7 text-base" />
            <Link
              href="/login?demo=1"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 text-base font-semibold text-ink shadow-xs transition hover:border-gray-300 hover:bg-gray-50"
            >
              <PlayCircle className="size-5 text-brand-600" /> Explore Demo
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">Works with Zoom, Google Meet and Microsoft Teams. No credit card needed.</p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
