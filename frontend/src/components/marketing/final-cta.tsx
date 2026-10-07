import Image from "next/image";
import Link from "next/link";

import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-16 size-80 rounded-full bg-brand-600/40 blur-3xl" />
            <div className="absolute -right-16 -bottom-28 size-96 rounded-full bg-brand-coral/25 blur-3xl" />
            <div className="absolute top-10 right-1/3 size-56 rounded-full bg-brand-sky/20 blur-3xl" />
          </div>
          <div className="relative">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg">
              <Image src="/brand/hersheys-mark.png" alt="" width={56} height={56} />
            </span>
            <h2 className="mx-auto mt-8 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-tight">
              Your meetings already contain the answers.
            </h2>
            <p className="mt-4 text-xl text-white/70 sm:text-2xl">Let AI turn them into action.</p>
            <Link
              href="/signup"
              className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              Get Started
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
