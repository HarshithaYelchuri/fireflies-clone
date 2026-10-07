"use client";

import { CalendarCheck, ListChecks, Lock, Search } from "lucide-react";
import dynamic from "next/dynamic";

import { Reveal } from "./reveal";

// Client-only: it measures its frame and formats dates in the visitor's locale.
const DashboardPreview = dynamic(() => import("./dashboard-preview"), {
  ssr: false,
  loading: () => <div className="aspect-[1280/780] w-full animate-pulse bg-gray-50" />,
});

const HIGHLIGHTS = [
  { icon: CalendarCheck, title: "Every meeting in one place", text: "Recent conversations, summaries and who was there." },
  { icon: ListChecks, title: "Your follow-ups, assigned", text: "Tasks pulled from meetings, with owners and due dates." },
  { icon: Search, title: "Search what was said", text: "Find any decision across transcripts and notes." },
];

/** Browser-window chrome around the preview. */
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_40px_120px_-40px_rgba(11,33,73,0.45),0_0_0_1px_rgba(11,33,73,0.02)] sm:rounded-[20px]">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex w-full max-w-sm items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">
          <Lock className="size-3" /> app.hersheys.ai/dashboard
        </div>
        <div className="w-[52px]" aria-hidden />
      </div>
      {children}
    </div>
  );
}

export function ProductSection() {
  return (
    <section id="product" className="relative scroll-mt-20 bg-gradient-to-b from-white via-gray-50/80 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">The product</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-[2.75rem] sm:leading-tight">
            Your meetings, finally organized.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            This is the actual Hersheys.ai workspace: your recent meetings, what needs doing, and everything your AI notetaker captured.
          </p>
        </Reveal>

        <Reveal delay={120} className="relative mt-14">
          <div aria-hidden className="absolute inset-x-[8%] -top-6 -bottom-10 -z-10 rounded-[48px] bg-gradient-to-r from-brand-200/50 via-pink-100/60 to-sky-200/50 blur-3xl" />
          <div role="img" aria-label="Preview of the Hersheys.ai dashboard">
            <BrowserFrame>
              <DashboardPreview />
            </BrowserFrame>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs ring-1 ring-gray-200">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
