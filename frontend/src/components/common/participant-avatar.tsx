import { initials } from "@/lib/format";
import { speakerColor } from "@/lib/speakers";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types/api";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-20 text-2xl",
} as const;

interface ParticipantAvatarProps {
  participant: Pick<Participant, "id" | "name"> | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function ParticipantAvatar({ participant, size = "md", className }: ParticipantAvatarProps) {
  const color = speakerColor(participant?.id);
  return (
    <span
      title={participant?.name ?? "Unknown speaker"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        color.bg,
        color.text,
        SIZES[size],
        className,
      )}
    >
      {participant ? initials(participant.name) : "?"}
    </span>
  );
}

interface AvatarStackProps {
  participants: Pick<Participant, "id" | "name">[];
  max?: number;
  size?: keyof typeof SIZES;
}

export function AvatarStack({ participants, max = 4, size = "sm" }: AvatarStackProps) {
  const shown = participants.slice(0, max);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center -space-x-1">
      {shown.map((p) => (
        <ParticipantAvatar key={p.id} participant={p} size={size} className="ring-2 ring-white" />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gray-100 font-medium text-gray-600 ring-2 ring-white",
            SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
