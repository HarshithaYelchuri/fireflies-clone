"use client";

import { ListTree } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types/api";

interface OutlinePanelProps {
  topics: Topic[];
  activeTopicId: number | null;
  onSeek: (time: number) => void;
}

/** Time-stamped meeting outline (topics / chapters). Clicking a chapter jumps the player there. */
export function OutlinePanel({ topics, activeTopicId, onSeek }: OutlinePanelProps) {
  if (!topics.length) {
    return <EmptyState icon={ListTree} title="No outline" description="Topics appear here once a meeting has been processed." />;
  }

  return (
    <ol className="relative grid gap-1 before:absolute before:top-3 before:bottom-3 before:left-[19px] before:w-px before:bg-gray-200">
      {topics.map((topic, index) => {
        const active = topic.id === activeTopicId;
        return (
          <li key={topic.id}>
            <button
              onClick={() => onSeek(topic.start_time)}
              className={cn(
                "relative flex w-full gap-3 rounded-lg p-2 text-left transition-colors",
                active ? "bg-brand-50" : "hover:bg-gray-50",
              )}
            >
              <span
                className={cn(
                  "z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-white",
                  active ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("text-sm font-semibold", active ? "text-brand-700" : "text-gray-900")}>{topic.title}</span>
                  <span className="shrink-0 font-mono text-xs text-brand-600 tabular-nums">
                    {formatTimestamp(topic.start_time)}
                  </span>
                </span>
                {topic.summary && <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{topic.summary}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
