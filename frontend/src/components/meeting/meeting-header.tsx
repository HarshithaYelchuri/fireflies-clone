"use client";

import {
  ChevronLeft,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useComingSoon } from "@/components/common/coming-soon";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { AvatarStack } from "@/components/common/participant-avatar";
import { PlatformIcon } from "@/components/common/platform-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";
import { PLATFORMS } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { ExportContent, MeetingDetail } from "@/types/api";

import { MeetingFormDialog } from "./meeting-form-dialog";

interface MeetingHeaderProps {
  meeting: MeetingDetail;
  onMeetingChange: (meeting: MeetingDetail) => void;
}

export function MeetingHeader({ meeting, onMeetingChange }: MeetingHeaderProps) {
  const router = useRouter();
  const showComingSoon = useComingSoon();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<ExportContent | null>(null);

  const exportPdf = async (content: ExportContent) => {
    setExporting(content);
    try {
      const { blob, filename } = await api.meetings.exportPdf(meeting.id, content);
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: filename });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("PDF downloaded", { description: filename });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const toggleStar = async () => {
    const is_starred = !meeting.is_starred;
    onMeetingChange({ ...meeting, is_starred });
    try {
      await api.meetings.update(meeting.id, { is_starred });
      toast.success(is_starred ? "Added to starred" : "Removed from starred");
    } catch (error) {
      onMeetingChange(meeting);
      toast.error((error as Error).message);
    }
  };

  const remove = async () => {
    try {
      await api.meetings.remove(meeting.id);
      toast.success("Meeting deleted", { description: meeting.title });
      router.push("/meetings");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  return (
    <header className="border-b bg-white px-4 py-4 md:px-6">
      <Link href="/meetings" className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600">
        <ChevronLeft className="size-3.5" /> Meetings
      </Link>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <PlatformIcon platform={meeting.platform} className="mt-0.5 hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{meeting.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500">
            <span>{formatDateTime(meeting.started_at)}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {formatDuration(meeting.duration_seconds)}
            </span>
            <span>{PLATFORMS[meeting.platform].label}</span>
            {meeting.participants.length > 0 && (
              <span className="flex items-center gap-2">
                <AvatarStack participants={meeting.participants} max={5} />
                {meeting.participants.length} participant{meeting.participants.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
          <Button
            variant="outline"
            size="icon-lg"
            onClick={toggleStar}
            aria-label={meeting.is_starred ? "Unstar meeting" : "Star meeting"}
            aria-pressed={meeting.is_starred}
          >
            <Star className={cn("size-4", meeting.is_starred && "fill-amber-400 text-amber-400")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-lg" aria-label="Download" disabled={exporting !== null} />}
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Export as PDF</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportPdf("summary")}>
                  <FileText /> AI notes &amp; action items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf("transcript")}>
                  <MessageSquareText /> Full transcript
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="h-9 px-3" onClick={() => showComingSoon("share")}>
            <Share2 /> Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-lg" aria-label="More options" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil /> Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2 /> Delete meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <MeetingFormDialog open={editing} onOpenChange={setEditing} meeting={meeting} onSaved={onMeetingChange} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this meeting?"
        description="The transcript, AI notes, topics and action items will be permanently deleted."
        confirmLabel="Delete meeting"
        onConfirm={remove}
      />
    </header>
  );
}
