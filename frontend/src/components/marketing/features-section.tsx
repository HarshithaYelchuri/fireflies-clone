import { BrainCircuit, Check, ListChecks, Mic, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/* Small illustrations, one per feature, built from the same tokens as the app. */

function CaptureArt() {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.95, 0.65, 0.4, 0.75, 0.55, 0.9, 0.45, 0.7];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs ring-1 ring-gray-100">
      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
        <span className="size-1.5 rounded-full bg-red-500" /> REC
      </span>
      <div className="flex h-7 flex-1 items-center gap-[3px]">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-full bg-brand-300 transition-colors group-hover:bg-brand-500" style={{ height: `${h * 100}%` }} />
        ))}
      </div>
      <span className="font-mono text-[11px] text-gray-400">24:08</span>
    </div>
  );
}

function InsightsArt() {
  return (
    <div className="space-y-2">
      {[
        { tag: "Decision", text: "Launch on Nov 18", tone: "bg-sky-50 text-sky-700" },
        { tag: "Highlight", text: "7 of 8 customers want it", tone: "bg-pink-50 text-pink-700" },
      ].map(({ tag, text, tone }) => (
        <div key={tag} className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs shadow-xs ring-1 ring-gray-100">
          <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", tone)}>{tag}</span>
          <span className="truncate text-gray-600">{text}</span>
        </div>
      ))}
    </div>
  );
}

function TasksArt() {
  return (
    <div className="space-y-2">
      {[
        { text: "Send pilot proposal", done: true },
        { text: "Freeze dashboard layout", done: false },
      ].map(({ text, done }) => (
        <div key={text} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 text-xs shadow-xs ring-1 ring-gray-100">
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border",
              done ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
            )}
          >
            {done && <Check className="size-2.5" />}
          </span>
          <span className={done ? "text-gray-400 line-through" : "font-medium text-gray-700"}>{text}</span>
        </div>
      ))}
    </div>
  );
}

function IntelligenceArt() {
  const weeks = [35, 55, 45, 70, 60, 85, 75];
  return (
    <div className="rounded-xl bg-white p-3 shadow-xs ring-1 ring-gray-100">
      <p className="text-[11px] font-medium text-gray-500">&ldquo;Pricing&rdquo; across 24 meetings</p>
      <div className="mt-2 flex h-12 items-end gap-1.5">
        {weeks.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-t-md", i === weeks.length - 2 ? "bg-brand-coral" : "bg-brand-100 group-hover:bg-brand-200")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; text: string; art: ReactNode; accent: string }[] = [
  {
    icon: Mic,
    title: "Smart Meeting Capture",
    text: "Capture conversations and keep every important moment accessible.",
    art: <CaptureArt />,
    accent: "text-brand-600 bg-brand-50",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    text: "Automatically identify decisions, highlights, and important discussion points.",
    art: <InsightsArt />,
    accent: "text-pink-600 bg-pink-50",
  },
  {
    icon: ListChecks,
    title: "Actionable Tasks",
    text: "Turn meeting outcomes into clear tasks and follow-ups.",
    art: <TasksArt />,
    accent: "text-sky-600 bg-sky-50",
  },
  {
    icon: BrainCircuit,
    title: "Meeting Intelligence",
    text: "Understand what happened across your meetings without manually reviewing everything.",
    art: <IntelligenceArt />,
    accent: "text-ink bg-gray-100",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-600">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-[2.75rem] sm:leading-tight">
            From conversation to clarity, automatically.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Hersheys.ai listens so your team can focus, then hands back exactly what matters.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text, art, accent }, i) => (
            <Reveal key={title} delay={i * 90}>
              <article className="group flex h-full flex-col rounded-3xl border border-gray-200/80 bg-gray-50/60 p-5 transition duration-300 hover:-translate-y-1 hover:border-gray-200 hover:bg-white hover:shadow-[0_24px_60px_-30px_rgba(11,33,73,0.35)]">
                <div className="min-h-[104px]">{art}</div>
                <span className={cn("mt-6 flex size-10 items-center justify-center rounded-xl", accent)}>
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
