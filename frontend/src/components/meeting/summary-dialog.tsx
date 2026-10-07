"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Summary } from "@/types/api";

interface SummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: number;
  summary: Summary | null;
  onSaved: (summary: Summary) => void;
}

function SummaryForm({ meetingId, summary, onSaved, onOpenChange }: Omit<SummaryDialogProps, "open">) {
  const [overview, setOverview] = useState(summary?.overview ?? "");
  const [bullets, setBullets] = useState((summary?.bullet_points ?? []).join("\n"));
  const [keywords, setKeywords] = useState((summary?.keywords ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await api.summary.save(meetingId, {
        overview: overview.trim(),
        bullet_points: bullets.split("\n").map((b) => b.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean),
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      });
      onSaved(saved);
      toast.success("Meeting notes saved");
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
        <DialogTitle>Edit AI notes</DialogTitle>
        <DialogDescription>Refine the generated summary. Changes are saved to this meeting.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="sum-keywords">Keywords</Label>
        <Input
          id="sum-keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Roadmap, Analytics, Launch date"
          className="h-9"
        />
        <p className="text-xs text-gray-500">Separate keywords with commas.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sum-overview">Overview</Label>
        <Textarea id="sum-overview" value={overview} onChange={(e) => setOverview(e.target.value)} rows={5} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sum-notes">Notes</Label>
        <Textarea
          id="sum-notes"
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          rows={6}
          placeholder="One bullet point per line"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SummaryDialog({ open, onOpenChange, ...props }: SummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">{open && <SummaryForm onOpenChange={onOpenChange} {...props} />}</DialogContent>
    </Dialog>
  );
}
