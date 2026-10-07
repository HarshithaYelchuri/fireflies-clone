"use client";

import { CircleCheckBig, Plus } from "lucide-react";
import { useState } from "react";

import { ActionItemDialog } from "@/components/action-items/action-item-dialog";
import { ActionItemRow } from "@/components/action-items/action-item-row";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type { ActionItem, Participant } from "@/types/api";

interface ActionItemsPanelProps {
  meetingId: number;
  items: ActionItem[];
  people: Participant[];
  currentTime: number;
  onSeek: (time: number) => void;
  onChange: (update: (items: ActionItem[]) => ActionItem[]) => void;
}

export function ActionItemsPanel({ meetingId, items, people, currentTime, onSeek, onChange }: ActionItemsPanelProps) {
  const [creating, setCreating] = useState(false);
  const open = items.filter((i) => !i.is_completed);
  const done = items.filter((i) => i.is_completed);

  const rowProps = {
    people,
    onSeek,
    onChanged: (updated: ActionItem) => onChange((list) => list.map((i) => (i.id === updated.id ? updated : i))),
    onDeleted: (id: number) => onChange((list) => list.filter((i) => i.id !== id)),
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {open.length} open · {done.length} done
        </p>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus /> Add action item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CircleCheckBig} title="No action items" description="Add follow-ups from this meeting so nothing slips." />
      ) : (
        <div className="-mx-3">
          {open.map((item) => (
            <ActionItemRow key={item.id} item={item} {...rowProps} />
          ))}
          {done.length > 0 && (
            <>
              <p className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">Completed</p>
              {done.map((item) => (
                <ActionItemRow key={item.id} item={item} {...rowProps} />
              ))}
            </>
          )}
        </div>
      )}

      <ActionItemDialog
        open={creating}
        onOpenChange={setCreating}
        people={people}
        meetingId={meetingId}
        currentTime={currentTime}
        onSaved={(item) => onChange((list) => [...list, item])}
      />
    </div>
  );
}
