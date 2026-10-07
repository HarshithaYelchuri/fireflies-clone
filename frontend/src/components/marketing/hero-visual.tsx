import { Check, CircleCheckBig, Sparkles } from "lucide-react";

import { ParticipantAvatar } from "@/components/common/participant-avatar";
import { cn } from "@/lib/utils";

const LINES = [
  { id: 1, name: "Priya Raman", time: "12:04", text: "So the dashboard is our anchor for Q4. Can we commit to a date?" },
  { id: 2, name: "Marcus Chen", time: "12:11", text: "November 18 works if the layout is frozen by the end of October.", active: true },
  { id: 3, name: "Sofia Alvarez", time: "12:19", text: "I can freeze it by the 31st and record the beta demo." },
];

const WAVE = [0.35, 0.6, 0.9, 0.55, 0.8, 1, 0.7, 0.45, 0.85, 0.6, 0.95, 0.5, 0.75, 0.4, 0.65, 0.9, 0.55, 0.35, 0.7, 0.5];

function FloatingCard({ className, delay = 0, children }: { className?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div
      className={cn("rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_20px_50px_-20px_rgba(11,33,73,0.35)] backdrop-blur", className)}
      style={{ animation: `float 7s ease-in-out ${delay}s infinite` }}
    >
      {children}
    </div>
  );
}

/** Product-flavoured hero illustration: a live meeting turning into a summary, a decision and tasks. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:h-[520px]" aria-hidden>
      {/* Live meeting */}
      <div className="relative rounded-3xl border border-gray-200/80 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(11,33,73,0.45)] sm:mx-8 lg:absolute lg:inset-x-0 lg:top-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Q4 Roadmap Sync</p>
            <p className="text-xs text-gray-500">Google Meet · 4 participants</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> Live · 12:19
          </span>
        </div>

        <div className="mt-4 space-y-1">
          {LINES.map((line) => (
            <div
              key={line.id}
              className={cn("flex gap-3 rounded-xl border-l-2 px-3 py-2.5", line.active ? "border-brand-500 bg-brand-50/70" : "border-transparent")}
            >
              <ParticipantAvatar participant={{ id: line.id, name: line.name }} size="sm" className="mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">
                  {line.name} <span className="ml-1 font-mono font-normal text-gray-400">{line.time}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-gray-600">{line.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-10 items-center gap-[3px] rounded-xl bg-gray-50 px-3">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="w-1 flex-1 origin-center rounded-full bg-gradient-to-t from-brand-500 to-brand-sky"
              style={{ height: `${h * 70}%`, animation: `equalize ${0.9 + (i % 5) * 0.12}s ease-in-out ${i * 0.05}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* AI summary */}
      <FloatingCard className="mt-4 sm:mx-8 lg:absolute lg:top-0 lg:right-[-1.5rem] lg:mx-0 lg:mt-0 lg:w-64" delay={0.4}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-600">
          <Sparkles className="size-3.5" /> AI summary
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[13px] text-gray-700">
          {["Dashboard launches Nov 18", "Layout freeze by Oct 31", "Beta demo before launch"].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-coral" />
              {t}
            </li>
          ))}
        </ul>
      </FloatingCard>

      {/* Action items */}
      <FloatingCard className="hidden lg:absolute lg:bottom-2 lg:left-[-2rem] lg:block lg:w-72" delay={1.2}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <CircleCheckBig className="size-3.5 text-brand-sky" /> Action items
        </p>
        <ul className="mt-2.5 space-y-2 text-[13px]">
          {[
            { text: "Freeze dashboard layout", who: "Sofia · Oct 31", done: true },
            { text: "Record beta demo video", who: "Sofia · Nov 10", done: false },
          ].map((t) => (
            <li key={t.text} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  t.done ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
                )}
              >
                {t.done && <Check className="size-3" />}
              </span>
              <span>
                <span className={cn("block font-medium", t.done ? "text-gray-400 line-through" : "text-gray-800")}>{t.text}</span>
                <span className="text-xs text-gray-500">{t.who}</span>
              </span>
            </li>
          ))}
        </ul>
      </FloatingCard>

      {/* Decision chip */}
      <div
        className="hidden items-center gap-2 rounded-full border border-sky-100 bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-[0_12px_30px_-12px_rgba(0,168,239,0.45)] lg:absolute lg:right-2 lg:bottom-16 lg:flex"
        style={{ animation: "float 7s ease-in-out 2s infinite" }}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-brand-sky text-white">
          <Check className="size-3" />
        </span>
        Decision captured
      </div>
    </div>
  );
}
