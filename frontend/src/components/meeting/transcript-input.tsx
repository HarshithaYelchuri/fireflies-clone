"use client";

import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseTranscript, transcriptFileToText } from "@/lib/transcript";
import { cn } from "@/lib/utils";

const ACCEPT = ".txt,.vtt,.srt,text/plain,text/vtt";
const MAX_BYTES = 2 * 1024 * 1024;

const SAMPLE_TRANSCRIPT = `[0:00] Priya Raman: Thanks for joining, let's review the launch checklist.
[0:06] Marcus Chen: Engineering is on track, QA starts Monday.
[0:12] Priya Raman: Great. Marcus, can you share the release notes by Friday?`;

interface TranscriptInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the file name (without extension) when a file is loaded, e.g. to suggest a title. */
  onFileLoaded?: (baseName: string) => void;
}

/** Paste a transcript, drop a file onto it, or browse for a .txt / .vtt / .srt file. */
export function TranscriptInput({ value, onChange, onFileLoaded }: TranscriptInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const parsed = parseTranscript(value);
  const speakers = new Set(parsed.lines.map((l) => l.speaker_name.toLowerCase())).size;

  const loadFile = async (file: File) => {
    if (!/\.(txt|vtt|srt)$/i.test(file.name)) {
      toast.error("Unsupported file", { description: "Upload a .txt, .vtt or .srt transcript." });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large", { description: "Transcripts up to 2 MB are supported." });
      return;
    }
    const { text, lineCount } = transcriptFileToText(file.name, await file.text());
    if (!lineCount) {
      toast.error(`No transcript lines found in ${file.name}`, { description: 'Expected lines like "[0:05] Speaker: text" or VTT/SRT cues.' });
      return;
    }
    onChange(text);
    onFileLoaded?.(file.name.replace(/\.[^.]+$/, ""));
    toast.success(`Loaded ${lineCount} lines from ${file.name}`);
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="m-transcript">Transcript</Label>
        <div className="flex items-center gap-3 text-xs font-medium">
          <button type="button" onClick={() => onChange(SAMPLE_TRANSCRIPT)} className="text-gray-500 hover:text-brand-600">
            Use sample
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-brand-600 hover:underline">
            <FileUp className="size-3.5" /> Upload file
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label="Upload transcript file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <div
        className="relative"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
      >
        <Textarea
          id="m-transcript"
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"Paste a transcript, or drop a .txt / .vtt / .srt file here\n\n[0:00] Speaker Name: What they said"}
          className="font-mono text-xs"
          aria-invalid={parsed.errors.length > 0}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-brand-400 bg-brand-50/90 text-sm font-medium text-brand-700 transition-opacity",
            dragging ? "opacity-100" : "opacity-0",
          )}
        >
          Drop to load transcript
        </div>
      </div>
      <p className={parsed.errors.length ? "text-xs text-red-600" : "text-xs text-gray-500"}>
        {parsed.errors.length
          ? `Couldn't read line ${parsed.errors.slice(0, 3).join(", ")}. Use "[mm:ss] Speaker: text".`
          : parsed.lines.length
            ? `${parsed.lines.length} lines from ${speakers} speaker${speakers === 1 ? "" : "s"}. Speakers are added as participants.`
            : "Optional. Format: [mm:ss] Speaker: text. Upload supports .txt, .vtt (WebVTT) and .srt captions."}
      </p>
    </div>
  );
}
