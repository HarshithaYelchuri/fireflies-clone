/** Stable per-person colours, used for avatars, transcript speaker labels and talk-time bars. */
export interface SpeakerColor {
  bg: string;
  text: string;
  bar: string;
}

const PALETTE: SpeakerColor[] = [
  { bg: "bg-brand-100", text: "text-brand-700", bar: "bg-brand-500" },
  { bg: "bg-pink-100", text: "text-pink-700", bar: "bg-pink-500" },
  { bg: "bg-teal-100", text: "text-teal-700", bar: "bg-teal-500" },
  { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" },
  { bg: "bg-sky-100", text: "text-sky-700", bar: "bg-sky-500" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", bar: "bg-fuchsia-500" },
  { bg: "bg-lime-100", text: "text-lime-700", bar: "bg-lime-600" },
  { bg: "bg-orange-100", text: "text-orange-700", bar: "bg-orange-500" },
];

const UNKNOWN: SpeakerColor = { bg: "bg-gray-100", text: "text-gray-600", bar: "bg-gray-400" };

export function speakerColor(id: number | null | undefined): SpeakerColor {
  return id == null ? UNKNOWN : PALETTE[id % PALETTE.length];
}
