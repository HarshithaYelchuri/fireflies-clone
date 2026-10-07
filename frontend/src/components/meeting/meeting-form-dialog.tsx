"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatAttendees, parseAttendees } from "@/lib/attendees";
import { toDateTimeInputValue } from "@/lib/format";
import { PLATFORM_OPTIONS } from "@/lib/platforms";
import { parseTranscript } from "@/lib/transcript";
import type { MeetingDetail, MeetingListItem, Platform } from "@/types/api";

import { TranscriptInput } from "./transcript-input";

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this meeting; omit to create a new one. */
  meeting?: MeetingListItem;
  /** "upload" frames the create form around importing a transcript file. */
  mode?: "form" | "upload";
  onSaved: (meeting: MeetingDetail) => void;
}

function MeetingForm({ meeting, mode = "form", onSaved, onOpenChange }: Omit<MeetingFormDialogProps, "open">) {
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [startedAt, setStartedAt] = useState(toDateTimeInputValue(meeting ? new Date(meeting.started_at) : new Date()));
  const [platform, setPlatform] = useState<Platform>(meeting?.platform ?? "zoom");
  const [durationMin, setDurationMin] = useState(meeting ? String(Math.round(meeting.duration_seconds / 60)) : "");
  const [description, setDescription] = useState(meeting?.description ?? "");
  const [attendees, setAttendees] = useState(meeting ? formatAttendees(meeting) : "");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseTranscript(transcript), [transcript]);
  const people = useMemo(() => parseAttendees(attendees), [attendees]);
  const minutes = durationMin.trim() === "" ? null : Number(durationMin);
  // Without a transcript the duration can't be inferred, so a new meeting needs one or the other.
  const needsDuration = !meeting && parsed.lines.length === 0 && !minutes;
  const invalid =
    !title.trim() ||
    !startedAt ||
    parsed.errors.length > 0 ||
    people.errors.length > 0 ||
    (minutes !== null && (!Number.isFinite(minutes) || minutes < 0)) ||
    needsDuration;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    const common = {
      title: title.trim(),
      description: description.trim() || null,
      platform,
      started_at: new Date(startedAt).toISOString(),
      participants: people.attendees,
    };
    const duration = minutes === null ? null : Math.round(minutes * 60);
    setSaving(true);
    try {
      const saved = meeting
        ? await api.meetings.update(meeting.id, { ...common, ...(duration !== null && { duration_seconds: duration }) })
        : await api.meetings.create({ ...common, duration_seconds: duration, transcript: parsed.lines });
      onSaved(saved);
      toast.success(meeting ? "Meeting updated" : "Meeting created", {
        description: !meeting && saved.summary ? `AI notes generated for "${saved.title}"` : saved.title,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{meeting ? "Edit meeting" : mode === "upload" ? "Upload a transcript" : "New meeting"}</DialogTitle>
        <DialogDescription>
          {meeting
            ? "Update the meeting details and attendees."
            : mode === "upload"
              ? "Import a .txt, .vtt or .srt transcript. AI notes, chapters and action items are generated automatically."
              : "Fill in the details and paste or upload a transcript to get AI notes automatically."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="m-title">Title</Label>
        <Input
          id="m-title"
          autoFocus={mode === "form"}
          required
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9"
          placeholder="Weekly sync"
        />
      </div>

      {!meeting && (
        <TranscriptInput
          value={transcript}
          onChange={setTranscript}
          onFileLoaded={(name) => setTitle((current) => current || name.replace(/[-_]+/g, " ").trim())}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5 sm:col-span-1">
          <Label htmlFor="m-date">Date &amp; time</Label>
          <Input id="m-date" type="datetime-local" required value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="h-9" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="m-platform">Platform</Label>
          <SelectField
            id="m-platform"
            value={platform}
            onChange={(v) => setPlatform(v as Platform)}
            options={PLATFORM_OPTIONS}
            className="w-full"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="m-duration">Duration (min)</Label>
          <Input
            id="m-duration"
            type="number"
            min={0}
            step="any"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder={meeting ? "" : "From transcript"}
            className="h-9"
            aria-invalid={needsDuration && title.trim() !== ""}
          />
        </div>
      </div>
      {needsDuration && title.trim() !== "" && (
        <p className="-mt-2 text-xs text-red-600">Add a transcript, or enter the meeting&apos;s duration.</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="m-description">Description</Label>
        <Input id="m-description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" placeholder="Optional" />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="m-attendees">Participants</Label>
        <Textarea
          id="m-attendees"
          rows={3}
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder={"Priya Raman <priya@lumenlabs.io>\nMarcus Chen"}
          aria-invalid={people.errors.length > 0}
        />
        {people.errors.length > 0 ? (
          <ul className="grid gap-0.5 text-xs text-red-600">
            {people.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">One per line as Name or Name &lt;email&gt;. The first person is the host.</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || invalid}>
          {saving ? "Saving…" : meeting ? "Save changes" : "Create meeting"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MeetingFormDialog({ open, onOpenChange, ...props }: MeetingFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {open && <MeetingForm onOpenChange={onOpenChange} {...props} />}
      </DialogContent>
    </Dialog>
  );
}
