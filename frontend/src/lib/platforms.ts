import type { Platform } from "@/types/api";

export const PLATFORMS: Record<Platform, { label: string; color: string }> = {
  zoom: { label: "Zoom", color: "#2D8CFF" },
  google_meet: { label: "Google Meet", color: "#00897B" },
  microsoft_teams: { label: "Microsoft Teams", color: "#5059C9" },
  webex: { label: "Webex", color: "#07A0C3" },
  upload: { label: "Upload", color: "#667085" },
};

export const PLATFORM_OPTIONS = Object.entries(PLATFORMS).map(([value, { label }]) => ({
  value: value as Platform,
  label,
}));
