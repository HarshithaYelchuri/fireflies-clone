"use client";

import { CalendarDays, MoreHorizontal, Pencil, PlayCircle, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ParticipantAvatar } from "@/components/common/participant-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { describeDueDate, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActionItem, Participant } from "@/types/api";

import { ActionItemDialog } from "./action-item-dialog";

interface ActionItemRowProps {
  item: ActionItem;
  people: Participant[];
  /** Show a link to the source meeting (used on the Tasks page). */
  showMeeting?: boolean;
  /** Jump the player to the moment the item came from (used on the meeting page). */
  onSeek?: (time: number) => void;
  onChanged: (item: ActionItem) => void;
  onDeleted: (id: number) => void;
}

export function ActionItemRow({ item, people, showMeeting, onSeek, onChanged, onDeleted }: ActionItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const due = item.due_date ? describeDueDate(item.due_date) : null;

  const toggle = async (checked: boolean) => {
    onChanged({ ...item, is_completed: checked }); // optimistic
    try {
      onChanged(await api.actionItems.update(item.id, { is_completed: checked }));
    } catch (error) {
      onChanged(item);
      toast.error((error as Error).message);
    }
  };

  const remove = async () => {
    try {
      await api.actionItems.remove(item.id);
      onDeleted(item.id);
      toast.success("Action item deleted");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  return (
    <div className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50">
      <Checkbox
        checked={item.is_completed}
        onCheckedChange={toggle}
        aria-label={item.is_completed ? "Mark as not done" : "Mark as done"}
        className="mt-0.5 size-[18px] rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", item.is_completed ? "text-gray-400 line-through" : "text-gray-900")}>
          {item.text}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {item.assignee ? (
            <span className="flex items-center gap-1.5">
              <ParticipantAvatar participant={item.assignee} size="xs" />
              {item.assignee.name}
            </span>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}
          {due && (
            <span className={cn("flex items-center gap-1", due.overdue && !item.is_completed && "font-medium text-red-600")}>
              <CalendarDays className="size-3.5" /> {due.label}
            </span>
          )}
          {item.timestamp != null && onSeek && (
            <button
              onClick={() => onSeek(item.timestamp!)}
              className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
            >
              <PlayCircle className="size-3.5" /> {formatTimestamp(item.timestamp)}
            </button>
          )}
          {showMeeting && (
            <Link
              href={`/meetings/${item.meeting_id}${item.timestamp != null ? `?t=${Math.floor(item.timestamp)}` : ""}`}
              className="flex min-w-0 items-center gap-1 hover:text-brand-600"
            >
              <Video className="size-3.5 shrink-0" />
              <span className="truncate">{item.meeting_title}</span>
            </Link>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Action item options"
          className="rounded-md p-1 text-gray-400 opacity-100 hover:bg-gray-200 hover:text-gray-700 data-popup-open:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ActionItemDialog open={editing} onOpenChange={setEditing} people={people} item={item} onSaved={onChanged} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete action item?"
        description={<>&ldquo;{item.text}&rdquo; will be permanently removed.</>}
        onConfirm={remove}
      />
    </div>
  );
}
