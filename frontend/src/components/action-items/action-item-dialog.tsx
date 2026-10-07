"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import type { ActionItem, Participant } from "@/types/api";

const UNASSIGNED = "none";

interface ActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** People who can be assigned. */
  people: Participant[];
  /** Edit this item; omit to create a new one. */
  item?: ActionItem;
  /** Meeting to create the item in. When omitted, `meetings` must be given so the user can pick one. */
  meetingId?: number;
  meetings?: { id: number; title: string }[];
  /** Current playback position; offered as the item's transcript timestamp when creating. */
  currentTime?: number;
  onSaved: (item: ActionItem) => void;
}

function ActionItemForm({ people, item, meetingId, meetings, currentTime, onSaved, onOpenChange }: Omit<ActionItemDialogProps, "open">) {
  const [text, setText] = useState(item?.text ?? "");
  const [assignee, setAssignee] = useState(item?.assignee_id ? String(item.assignee_id) : UNASSIGNED);
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [targetMeeting, setTargetMeeting] = useState(String(item?.meeting_id ?? meetingId ?? meetings?.[0]?.id ?? ""));
  const [linkMoment, setLinkMoment] = useState(currentTime !== undefined && currentTime > 0);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !targetMeeting) return;
    const input = {
      text: text.trim(),
      assignee_id: assignee === UNASSIGNED ? null : Number(assignee),
      due_date: dueDate || null,
    };
    setSaving(true);
    try {
      const saved = item
        ? await api.actionItems.update(item.id, input)
        : await api.actionItems.create(Number(targetMeeting), {
            ...input,
            timestamp: linkMoment && currentTime !== undefined ? Math.floor(currentTime) : null,
          });
      onSaved(saved);
      toast.success(item ? "Action item updated" : "Action item added");
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
        <DialogTitle>{item ? "Edit action item" : "New action item"}</DialogTitle>
        <DialogDescription>Track a follow-up and who owns it.</DialogDescription>
      </DialogHeader>

      {!item && !meetingId && meetings && (
        <div className="grid gap-1.5">
          <Label htmlFor="ai-meeting">Meeting</Label>
          <SelectField
            id="ai-meeting"
            value={targetMeeting}
            onChange={setTargetMeeting}
            options={meetings.map((m) => ({ value: String(m.id), label: m.title }))}
            className="w-full"
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="ai-text">Task</Label>
        <Textarea
          id="ai-text"
          autoFocus
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Send the revised proposal to Brightwave"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ai-assignee">Assignee</Label>
          <SelectField
            id="ai-assignee"
            value={assignee}
            onChange={setAssignee}
            options={[{ value: UNASSIGNED, label: "Unassigned" }, ...people.map((p) => ({ value: String(p.id), label: p.name }))]}
            className="w-full"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ai-due">Due date</Label>
          <Input id="ai-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
        </div>
      </div>

      {!item && currentTime !== undefined && currentTime > 0 && (
        <Label className="font-normal text-gray-600">
          <Checkbox checked={linkMoment} onCheckedChange={setLinkMoment} />
          Link to the current moment ({formatTimestamp(currentTime)})
        </Label>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !text.trim() || !targetMeeting}>
          {saving ? "Saving…" : item ? "Save changes" : "Add action item"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ActionItemDialog({ open, onOpenChange, ...props }: ActionItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <ActionItemForm key={props.item?.id ?? "new"} onOpenChange={onOpenChange} {...props} />}
      </DialogContent>
    </Dialog>
  );
}
