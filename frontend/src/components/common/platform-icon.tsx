import { Upload, Video } from "lucide-react";

import { PLATFORMS } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types/api";

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const { label, color } = PLATFORMS[platform];
  const Icon = platform === "upload" ? Upload : Video;
  return (
    <span
      title={label}
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: `${color}14`, color }}
    >
      <Icon className="size-4" />
    </span>
  );
}
