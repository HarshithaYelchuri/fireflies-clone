"use client";

import { ChevronDown, ChevronUp, Copy, LocateFixed, Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ParticipantAvatar } from "@/components/common/participant-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimestamp } from "@/lib/format";
import { speakerColor } from "@/lib/speakers";
import { countMatches, splitByQuery } from "@/lib/transcript";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/types/api";

interface Match {
  segmentIndex: number;
  occurrence: number; // n-th hit inside that segment
}

function scrollRowIntoView(container: HTMLElement | null, index: number) {
  container?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
}

interface RowProps {
  segment: TranscriptSegment;
  active: boolean;
  query: string;
  /** Which hit inside this row is the "current" search result, if any. */
  currentOccurrence: number | null;
  onSelect: (segment: TranscriptSegment) => void;
}

const TranscriptRow = memo(function TranscriptRow({ segment, active, query, currentOccurrence, onSelect }: RowProps) {
  const color = speakerColor(segment.speaker_id);
  // Number each hit so the current search result can be told apart from the others.
  let hits = 0;
  const parts = splitByQuery(segment.text, query).map((part) => ({ ...part, hit: part.match ? hits++ : -1 }));
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(segment)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(segment)}
      data-active={active || undefined}
      className={cn(
        "group flex gap-3 rounded-lg border-l-2 px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
        active ? "border-brand-500 bg-brand-50/70" : "border-transparent hover:bg-gray-50",
      )}
    >
      <ParticipantAvatar participant={segment.speaker} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-sm font-semibold", color.text)}>{segment.speaker?.name ?? "Unknown speaker"}</span>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              active ? "text-brand-600" : "text-gray-400 group-hover:text-brand-600",
            )}
          >
            {formatTimestamp(segment.start_time)}
          </span>
        </div>
        <p className={cn("mt-0.5 text-sm leading-relaxed", active ? "text-gray-900" : "text-gray-700")}>
          {parts.map((part, i) =>
            part.match ? (
              <mark key={i} className={cn("hit", part.hit === currentOccurrence && "hit-current")}>
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </p>
      </div>
    </div>
  );
});

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  activeIndex: number;
  onSeek: (time: number) => void;
  initialQuery?: string;
}

export const TranscriptPanel = memo(function TranscriptPanel({ segments, activeIndex, onSeek, initialQuery = "" }: TranscriptPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [cursor, setCursor] = useState({ query: "", index: 0 });
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const matches = useMemo<Match[]>(
    () =>
      segments.flatMap((s, segmentIndex) =>
        Array.from({ length: countMatches(s.text, query) }, (_, occurrence) => ({ segmentIndex, occurrence })),
      ),
    [segments, query],
  );
  // Reset to the first hit whenever the query changes.
  const matchIndex = cursor.query === query ? Math.min(cursor.index, Math.max(0, matches.length - 1)) : 0;
  const current = matches[matchIndex];

  const step = (delta: number) => {
    if (!matches.length) return;
    setCursor({ query, index: (matchIndex + delta + matches.length) % matches.length });
  };

  // Search result navigation wins over playback-follow while a query is active.
  useEffect(() => {
    if (current) scrollRowIntoView(scrollRef.current, current.segmentIndex);
  }, [current]);

  useEffect(() => {
    if (follow && !query.trim() && activeIndex >= 0) scrollRowIntoView(scrollRef.current, activeIndex);
  }, [activeIndex, follow, query]);

  const select = useCallback(
    (segment: TranscriptSegment) => {
      setFollow(true);
      onSeek(segment.start_time);
    },
    [onSeek],
  );

  const copyTranscript = async () => {
    const text = segments
      .map((s) => `[${formatTimestamp(s.start_time)}] ${s.speaker?.name ?? "Unknown"}: ${s.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transcript copied to clipboard");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                step(e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") {
                setQuery("");
              }
            }}
            placeholder="Search transcript"
            aria-label="Search transcript"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-24 pl-8 text-sm outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          {query && (
            <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
              <span className="px-1 text-xs text-gray-500 tabular-nums" aria-live="polite">
                {matches.length ? `${matchIndex + 1}/${matches.length}` : "0/0"}
              </span>
              <button onClick={() => step(-1)} aria-label="Previous match" className="rounded p-0.5 text-gray-500 hover:bg-gray-100">
                <ChevronUp className="size-4" />
              </button>
              <button onClick={() => step(1)} aria-label="Next match" className="rounded p-0.5 text-gray-500 hover:bg-gray-100">
                <ChevronDown className="size-4" />
              </button>
              <button onClick={() => setQuery("")} aria-label="Clear search" className="rounded p-0.5 text-gray-500 hover:bg-gray-100">
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger
            onClick={copyTranscript}
            aria-label="Copy transcript"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Copy className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Copy transcript</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onWheel={() => setFollow(false)}
          onTouchMove={() => setFollow(false)}
          className="h-full space-y-0.5 overflow-y-auto px-2 py-2"
        >
          {segments.length === 0 && (
            <EmptyState icon={Search} title="No transcript" description="This meeting doesn't have a transcript yet." />
          )}
          {query.trim() && segments.length > 0 && matches.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">No matches for &ldquo;{query.trim()}&rdquo;.</p>
          )}
          {segments.map((segment, index) => (
            <div key={segment.id} data-index={index}>
              <TranscriptRow
                segment={segment}
                active={index === activeIndex}
                query={query}
                currentOccurrence={current?.segmentIndex === index ? current.occurrence : null}
                onSelect={select}
              />
            </div>
          ))}
        </div>

        {!follow && activeIndex >= 0 && (
          <button
            onClick={() => setFollow(true)}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-gray-800"
          >
            <LocateFixed className="size-3.5" /> Resume auto-scroll
          </button>
        )}
      </div>
    </div>
  );
});
