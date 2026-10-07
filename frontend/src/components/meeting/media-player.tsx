"use client";

import { Gauge, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAYBACK_RATES, type Playback } from "@/hooks/use-playback";
import { formatTimestamp } from "@/lib/format";
import { speakerColor } from "@/lib/speakers";
import { cn } from "@/lib/utils";
import type { Topic, TranscriptSegment } from "@/types/api";

const SKIP_SECONDS = 15;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || !!target.closest("[role=dialog]");
}

/** Space = play/pause, ←/→ = skip 5s (ignored while typing or inside a dialog). */
function useKeyboardShortcuts(playback: Playback) {
  const { toggle, skip } = playback;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === " ") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowLeft") {
        skip(-5);
      } else if (event.key === "ArrowRight") {
        skip(5);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, skip]);
}

interface TimelineProps {
  playback: Playback;
  segments: TranscriptSegment[];
  topics: Topic[];
}

/** Scrubber showing who spoke when (speaker colours) with chapter markers; click or drag to seek. */
function Timeline({ playback, segments, topics }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { duration, currentTime, seek } = playback;
  const pct = (t: number) => (duration ? `${Math.min(100, (t / duration) * 100)}%` : "0%");

  const seekToPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    seek(((clientX - rect.left) / rect.width) * duration);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={formatTimestamp(currentTime)}
      className="group relative h-6 cursor-pointer touch-none outline-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekToPointer(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && seekToPointer(e.clientX)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          seek(currentTime + (e.key === "ArrowLeft" ? -5 : 5));
        }
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-gray-100 group-hover:h-2">
        {segments.map((s) => (
          <span
            key={s.id}
            className={cn("absolute inset-y-0 opacity-30", speakerColor(s.speaker_id).bar)}
            style={{ left: pct(s.start_time), width: pct(s.end_time - s.start_time) }}
          />
        ))}
        <span className="absolute inset-y-0 left-0 bg-brand-500" style={{ width: pct(currentTime) }} />
      </div>
      {topics.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger
            render={<span />}
            className="absolute top-1/2 z-10 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-gray-400"
            style={{ left: pct(t.start_time) }}
          />
          <TooltipContent>
            {formatTimestamp(t.start_time)} · {t.title}
          </TooltipContent>
        </Tooltip>
      ))}
      <span
        className="absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow ring-brand-200 group-focus-visible:ring-4"
        style={{ left: pct(currentTime) }}
      />
    </div>
  );
}

export function MediaPlayer({ playback, segments, topics }: TimelineProps) {
  const { playing, currentTime, duration, rate, toggle, skip, setRate } = playback;
  useKeyboardShortcuts(playback);

  return (
    <div className="border-t bg-white px-4 py-2.5 shadow-[0_-4px_16px_-8px_rgba(16,24,40,0.08)] md:px-6">
      <Timeline playback={playback} segments={segments} topics={topics} />
      <div className="mt-1 flex items-center gap-2">
        <span className="w-24 font-mono text-xs text-gray-500 tabular-nums">
          {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
        </span>

        <div className="mx-auto flex items-center gap-1">
          <button
            onClick={() => skip(-SKIP_SECONDS)}
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw className="size-5" />
            <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[8px] font-bold">15</span>
          </button>
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex size-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95"
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
          <button
            onClick={() => skip(SKIP_SECONDS)}
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
          >
            <RotateCw className="size-5" />
            <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[8px] font-bold">15</span>
          </button>
        </div>

        <div className="flex w-24 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Playback speed"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              <Gauge className="size-3.5" /> {rate}x
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-28">
              <DropdownMenuRadioGroup value={String(rate)} onValueChange={(value) => setRate(Number(value))}>
                {PLAYBACK_RATES.map((r) => (
                  <DropdownMenuRadioItem key={r} value={String(r)}>
                    {r}x
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
