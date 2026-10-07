"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlayback } from "@/hooks/use-playback";
import { useResource } from "@/hooks/use-resource";
import { api, ApiError } from "@/lib/api";
import { findActiveSegmentIndex } from "@/lib/transcript";
import type { ActionItem, MeetingDetail } from "@/types/api";

import { ActionItemsPanel } from "./action-items-panel";
import { MediaPlayer } from "./media-player";
import { MediaPreview } from "./media-preview";
import { MeetingHeader } from "./meeting-header";
import { OutlinePanel } from "./outline-panel";
import { SummaryPanel } from "./summary-panel";
import { TranscriptPanel } from "./transcript-panel";

function MeetingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function Workspace({
  meeting,
  initialTime,
  initialQuery,
  onMeetingChange,
}: {
  meeting: MeetingDetail;
  initialTime: number;
  initialQuery: string;
  onMeetingChange: (update: (m: MeetingDetail) => MeetingDetail) => void;
}) {
  const playback = usePlayback(meeting.duration_seconds);
  const { currentTime, seek, play } = playback;

  // Deep links like /meetings/3?t=95 (from Tasks) start at that moment.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && initialTime > 0) seek(initialTime);
    seeded.current = true;
  }, [initialTime, seek]);

  const activeIndex = findActiveSegmentIndex(meeting.segments, currentTime);
  const activeSpeaker = activeIndex >= 0 ? meeting.segments[activeIndex].speaker : null;
  const activeTopicId =
    meeting.topics.findLast((t) => t.start_time <= currentTime && currentTime < t.end_time + 1)?.id ?? null;

  /** Transcript → player: jump to a moment and start playing from there. */
  const seekAndPlay = useCallback(
    (time: number) => {
      seek(time);
      play();
    },
    [seek, play],
  );

  const people = useMemo(() => meeting.participants.map(({ id, name, email }) => ({ id, name, email })), [meeting.participants]);
  const setActionItems = (update: (items: ActionItem[]) => ActionItem[]) =>
    onMeetingChange((m) => {
      const action_items = update(m.action_items);
      return {
        ...m,
        action_items,
        action_items_count: action_items.length,
        open_action_items_count: action_items.filter((i) => !i.is_completed).length,
      };
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* AI notes */}
        <section className="min-w-0 flex-1 lg:overflow-y-auto">
          <Tabs defaultValue="summary" className="mx-auto max-w-3xl gap-0 px-4 py-4 md:px-6">
            <TabsList variant="line" className="mb-4 w-full justify-start gap-4 border-b pb-0">
              <TabsTrigger value="summary" className="flex-none px-1 pb-2.5">
                Summary
              </TabsTrigger>
              <TabsTrigger value="action-items" className="flex-none px-1 pb-2.5">
                Action items
                <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{meeting.open_action_items_count}</span>
              </TabsTrigger>
              <TabsTrigger value="outline" className="flex-none px-1 pb-2.5">
                Outline
                <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{meeting.topics.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <SummaryPanel
                meeting={meeting}
                onSummaryChange={(summary) => onMeetingChange((m) => ({ ...m, summary, keywords: summary.keywords, overview: summary.overview }))}
                onMeetingChange={(updated) => onMeetingChange(() => updated)}
              />
            </TabsContent>
            <TabsContent value="action-items">
              <ActionItemsPanel
                meetingId={meeting.id}
                items={meeting.action_items}
                people={people}
                currentTime={currentTime}
                onSeek={seekAndPlay}
                onChange={setActionItems}
              />
            </TabsContent>
            <TabsContent value="outline">
              <OutlinePanel topics={meeting.topics} activeTopicId={activeTopicId} onSeek={seekAndPlay} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Media + transcript */}
        <aside className="flex h-[75dvh] shrink-0 flex-col border-t bg-white lg:h-auto lg:w-[440px] lg:border-t-0 lg:border-l xl:w-[500px]">
          <div className="p-4 pb-3">
            <MediaPreview playback={playback} speaker={activeSpeaker} platform={meeting.platform} />
          </div>
          <div className="min-h-0 flex-1 border-t">
            <TranscriptPanel segments={meeting.segments} activeIndex={activeIndex} onSeek={seekAndPlay} initialQuery={initialQuery} />
          </div>
        </aside>
      </div>

      <MediaPlayer playback={playback} segments={meeting.segments} topics={meeting.topics} />
    </div>
  );
}

interface MeetingViewProps {
  id: number;
  /** Start position in seconds (from `?t=`). */
  initialTime?: number;
  /** Pre-filled transcript search (from `?q=`, e.g. when opened from a library search). */
  initialQuery?: string;
}

export function MeetingView({ id, initialTime = 0, initialQuery = "" }: MeetingViewProps) {
  const { data: meeting, error, initialLoading, reload, mutate } = useResource(`meeting:${id}`, () => api.meetings.get(id));

  if (initialLoading) return <MeetingSkeleton />;
  if (error && !meeting) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          icon={SearchX}
          title="Meeting not found"
          description="It may have been deleted."
          action={<Button nativeButton={false} render={<Link href="/meetings" />}>Back to meetings</Button>}
          className="py-24"
        />
      );
    }
    return (
      <div className="p-6">
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }
  if (!meeting) return null;

  return (
    <div className="flex h-full flex-col">
      <MeetingHeader meeting={meeting} onMeetingChange={(m) => mutate(() => m)} />
      <Workspace meeting={meeting} initialTime={initialTime} initialQuery={initialQuery} onMeetingChange={mutate} />
    </div>
  );
}
