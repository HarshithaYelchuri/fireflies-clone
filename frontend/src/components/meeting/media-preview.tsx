import { Pause, Play } from "lucide-react";

import { ParticipantAvatar } from "@/components/common/participant-avatar";
import type { Playback } from "@/hooks/use-playback";
import { PLATFORMS } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { Participant, Platform } from "@/types/api";

const BARS = [0.5, 0.9, 0.65, 1, 0.75, 0.55, 0.85];

interface MediaPreviewProps {
  playback: Playback;
  speaker: Participant | null;
  platform: Platform;
}

/** Stand-in for the recording's video frame: shows who is speaking at the playhead. */
export function MediaPreview({ playback, speaker, platform }: MediaPreviewProps) {
  const { playing, toggle } = playback;
  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause recording" : "Play recording"}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 text-white"
    >
      <div className="flex flex-col items-center gap-3">
        <ParticipantAvatar
          participant={speaker}
          size="xl"
          className={cn("ring-4 ring-white/10 transition", playing && speaker && "ring-brand-400/70")}
        />
        <div className="flex h-5 items-end gap-0.5" aria-hidden>
          {BARS.map((height, i) => (
            <span
              key={i}
              className="w-1 origin-bottom rounded-full bg-brand-300"
              style={{
                height: `${height * 100}%`,
                animation: playing && speaker ? `equalize ${0.6 + i * 0.07}s ease-in-out infinite` : undefined,
                transform: playing && speaker ? undefined : "scaleY(0.25)",
              }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-white/90">{speaker?.name ?? (playing ? "…" : "Ready to play")}</p>
      </div>

      <span className="absolute top-3 left-3 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
        {PLATFORMS[platform].label} recording
      </span>
      <span className="absolute top-3 right-3 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
        Sample player
      </span>
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-brand-700">
          {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
        </span>
      </span>
    </button>
  );
}
