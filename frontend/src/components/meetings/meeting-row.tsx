"use client";

import { CircleCheckBig, Clock, ExternalLink, FileText, MessageSquareText, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Highlight } from "@/components/common/highlight";
import { AvatarStack } from "@/components/common/participant-avatar";
import { PlatformIcon } from "@/components/common/platform-icon";
import { MeetingFormDialog } from "@/components/meeting/meeting-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatDate, formatDuration, formatTime, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MeetingListItem, SearchMatch } from "@/types/api";

const MATCH_LABELS: Record<SearchMatch["field"], string> = {
  title: "Title",
  description: "Description",
  transcript: "Transcript",
  overview: "Notes",
  keywords: "Keyword",
};

interface MeetingRowProps {
  meeting: MeetingListItem;
  query?: string;
  onChanged: (meeting: MeetingListItem) => void;
  onDeleted: (id: number) => void;
}

export function MeetingRow({ meeting, query = "", onChanged, onDeleted }: MeetingRowProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const match = query.trim() ? meeting.match : null;
  // Opening a search result pre-fills the transcript search (and jumps to the matching moment).
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const href = `/meetings/${meeting.id}${search}`;
  const matchHref = match?.start_time != null ? `${href}&t=${Math.floor(match.start_time)}` : href;

  const toggleStar = async () => {
    const is_starred = !meeting.is_starred;
    onChanged({ ...meeting, is_starred });
    try {
      await api.meetings.update(meeting.id, { is_starred });
    } catch (error) {
      onChanged(meeting);
      toast.error((error as Error).message);
    }
  };

  const remove = async () => {
    try {
      await api.meetings.remove(meeting.id);
      onDeleted(meeting.id);
      toast.success("Meeting deleted", { description: meeting.title });
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  return (
    <div data-meeting-row className="group relative flex items-center gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-gray-25 md:px-5">
      <PlatformIcon platform={meeting.platform} />

      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="block outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-brand-200"
        >
          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">
            <Highlight text={meeting.title} query={query} />
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            <span>
              {formatDate(meeting.started_at, { weekday: "short" })} · {formatTime(meeting.started_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {formatDuration(meeting.duration_seconds)}
            </span>
            {meeting.action_items_count > 0 && (
              <span className="flex items-center gap-1">
                <CircleCheckBig className="size-3" />
                {meeting.open_action_items_count} of {meeting.action_items_count} tasks open
              </span>
            )}
          </p>
        </Link>
        {match && match.field !== "title" && (
          <Link
            href={matchHref}
            className="relative z-10 mt-2 flex max-w-3xl items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-gray-600 ring-1 ring-amber-100 hover:bg-amber-100/70"
          >
            <span className="flex shrink-0 items-center gap-1 font-semibold text-amber-800">
              {match.field === "transcript" ? <MessageSquareText className="size-3.5" /> : <FileText className="size-3.5" />}
              {MATCH_LABELS[match.field]}
              {match.start_time != null && ` · ${formatTimestamp(match.start_time)}`}
            </span>
            <span className="line-clamp-2">
              <Highlight text={match.snippet} query={query} />
            </span>
          </Link>
        )}
        {meeting.keywords.length > 0 && (
          <span className="mt-2 hidden flex-wrap gap-1 sm:flex">
            {meeting.keywords.slice(0, 4).map((k) => (
              <span key={k} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                <Highlight text={k} query={query} />
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="relative z-10 hidden md:block">
        <AvatarStack participants={meeting.participants} max={4} />
      </div>

      <div className="relative z-10 flex items-center">
        <button
          onClick={toggleStar}
          aria-label={meeting.is_starred ? "Unstar meeting" : "Star meeting"}
          aria-pressed={meeting.is_starred}
          className={cn(
            "rounded-md p-1.5 transition hover:bg-gray-100",
            meeting.is_starred ? "text-amber-400" : "text-gray-300 hover:text-gray-500",
          )}
        >
          <Star className={cn("size-4", meeting.is_starred && "fill-current")} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Meeting options" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem render={<Link href={href} />}>
              <ExternalLink /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil /> Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MeetingFormDialog open={editing} onOpenChange={setEditing} meeting={meeting} onSaved={onChanged} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this meeting?"
        description={<>&ldquo;{meeting.title}&rdquo; and its transcript, notes and action items will be permanently deleted.</>}
        confirmLabel="Delete meeting"
        onConfirm={remove}
      />
    </div>
  );
}
