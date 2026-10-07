import type { TranscriptLineInput, TranscriptSegment } from "@/types/api";

import { formatTimestamp } from "./format";

/** Index of the segment playing at `time` (binary search over segments sorted by start_time), or -1. */
export function findActiveSegmentIndex(segments: TranscriptSegment[], time: number): number {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid].start_time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  // Keep the last spoken line highlighted through short pauses between turns.
  if (found >= 0 && time > segments[found].end_time + 3) return -1;
  return found;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** Split `text` into alternating plain/matching parts for case-insensitive `query`. */
export function splitByQuery(text: string, query: string): TextPart[] {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  return text
    .split(new RegExp(`(${escapeRegExp(needle)})`, "gi"))
    .filter(Boolean)
    .map((part) => ({ text: part, match: part.toLowerCase() === needle.toLowerCase() }));
}

export function countMatches(text: string, query: string): number {
  const needle = query.trim();
  if (!needle) return 0;
  return (text.match(new RegExp(escapeRegExp(needle), "gi")) ?? []).length;
}

/**
 * Parse pasted transcript text. Each line looks like `[mm:ss] Speaker Name: what they said`
 * (brackets optional, `h:mm:ss` allowed). Lines without a timestamp are placed 5s after the previous one.
 */
export function parseTranscript(raw: string): { lines: TranscriptLineInput[]; errors: number[] } {
  const lines: TranscriptLineInput[] = [];
  const errors: number[] = [];
  let lastTime = -5;

  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const match = line.match(/^\s*\[?((?:\d{1,2}:)?\d{1,2}:\d{2})?\]?\s*([^:]{1,120}):\s*(.+)$/);
    if (!match) {
      errors.push(index + 1);
      return;
    }
    const [, stamp, speaker, text] = match;
    const time = stamp
      ? stamp.split(":").map(Number).reduce((total, part) => total * 60 + part, 0)
      : lastTime + 5;
    lastTime = time;
    lines.push({ speaker_name: speaker.trim(), start_time: time, text: text.trim() });
  });

  return { lines, errors };
}

const CUE_TIMING = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,]\d{1,3}\s*-->/;

/**
 * Parse WebVTT / SRT captions. The speaker comes from a `<v Name>` voice tag or a `Name:` prefix;
 * cues without one keep the previous speaker.
 */
export function parseCaptions(raw: string): TranscriptLineInput[] {
  const lines: TranscriptLineInput[] = [];
  let speaker = "Speaker 1";

  for (const block of raw.replace(/\r/g, "").split(/\n{2,}/)) {
    const rows = block.split("\n").map((row) => row.trim()).filter(Boolean);
    const timingRow = rows.findIndex((row) => CUE_TIMING.test(row));
    if (timingRow < 0) continue; // WEBVTT header, NOTE or STYLE blocks
    const [, h = "0", m, s] = rows[timingRow].match(CUE_TIMING)!;
    let text = rows.slice(timingRow + 1).join(" ");

    const voice = text.match(/^<v(?:\.[^\s>]*)?\s+([^>]+)>/);
    const prefix = text.replace(/<[^>]+>/g, "").match(/^([^:]{1,60}):\s+(.+)$/);
    if (voice) speaker = voice[1].trim();
    text = text.replace(/<[^>]+>/g, "").trim();
    if (!voice && prefix) [, speaker, text] = prefix;
    if (!text) continue;

    lines.push({ speaker_name: speaker.trim(), start_time: Number(h) * 3600 + Number(m) * 60 + Number(s), text: text.trim() });
  }
  return lines;
}

/** Render lines back into the editable `[mm:ss] Speaker: text` format. */
export function formatTranscriptLines(lines: TranscriptLineInput[]): string {
  return lines.map((l) => `[${formatTimestamp(l.start_time)}] ${l.speaker_name}: ${l.text}`).join("\n");
}

/** Read an uploaded .txt / .vtt / .srt transcript into the editable text format. */
export function transcriptFileToText(fileName: string, raw: string): { text: string; lineCount: number } {
  const isCaptions = /\.(vtt|srt)$/i.test(fileName) || /-->/.test(raw);
  if (!isCaptions) {
    const text = raw.replace(/\r/g, "").trim();
    return { text, lineCount: parseTranscript(text).lines.length };
  }
  const lines = parseCaptions(raw);
  return { text: formatTranscriptLines(lines), lineCount: lines.length };
}
