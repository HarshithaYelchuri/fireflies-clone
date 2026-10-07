"use client";

import { ArrowRight, CalendarDays, CircleCheckBig, Clock, Link2, Mic, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ActionItemRow } from "@/components/action-items/action-item-row";
import { useAuth } from "@/components/auth/auth-provider";
import { useComingSoon } from "@/components/common/coming-soon";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { AvatarStack } from "@/components/common/participant-avatar";
import { PlatformIcon } from "@/components/common/platform-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { formatDate, formatDuration, formatTime, greeting } from "@/lib/format";
import type { ActionItem, MeetingListItem, Participant } from "@/types/api";

const WEEK_MS = 7 * 86_400_000;

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-white shadow-xs ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Video; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-xs">
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function CaptureBanner() {
  const showComingSoon = useComingSoon();
  const [link, setLink] = useState("");
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-magenta p-5 text-white shadow-sm md:p-6">
      <div className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Mic className="size-5" /> Add Fred to a live meeting
          </p>
          <p className="mt-1 text-sm text-white/80">Paste a Zoom, Google Meet or Teams link and Fred will take notes for you.</p>
        </div>
        <form
          className="flex w-full gap-2 md:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            showComingSoon("capture");
          }}
        >
          <div className="relative flex-1 md:w-72">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/60" />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://meet.google.com/…"
              aria-label="Meeting link"
              className="h-10 w-full rounded-lg border border-white/20 bg-white/10 pr-3 pl-9 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/50"
            />
          </div>
          <Button type="submit" className="h-10 bg-white px-4 text-brand-700 hover:bg-white/90">
            Capture
          </Button>
        </form>
      </div>
    </div>
  );
}

export interface DashboardContentProps {
  heading: string;
  /** undefined while loading */
  meetings?: MeetingListItem[];
  meetingsError?: { message: string; retry: () => void };
  stats: { lastWeek?: number; totalSeconds?: number; openTasks?: number };
  /** The signed-in user's tasks; undefined while loading */
  tasks?: ActionItem[];
  people: Participant[];
  onTaskChanged: (item: ActionItem) => void;
  onTaskRemoved: (id: number) => void;
}

/** The dashboard layout itself, fed by props so it can also render sample data (landing page preview). */
export function DashboardContent({
  heading,
  meetings,
  meetingsError,
  stats,
  tasks,
  people,
  onTaskChanged,
  onTaskRemoved,
}: DashboardContentProps) {
  const showComingSoon = useComingSoon();
  const items = meetings ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" suppressHydrationWarning>
          {heading} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening across your meetings.</p>
      </div>

      <CaptureBanner />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Video} label="Meetings in the last 7 days" value={stats.lastWeek ?? "–"} />
        <Stat icon={Clock} label="Time transcribed" value={stats.totalSeconds !== undefined ? formatDuration(stats.totalSeconds) : "–"} />
        <Stat icon={CircleCheckBig} label="My open tasks" value={stats.openTasks ?? "–"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title="Recent meetings"
          action={
            <Link href="/meetings" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {meetings === undefined && !meetingsError ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : meetingsError ? (
            <div className="p-4">
              <ErrorState message={meetingsError.message} onRetry={meetingsError.retry} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Video} title="No meetings yet" />
          ) : (
            <ul className="divide-y">
              {items.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-25">
                    <PlatformIcon platform={m.platform} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">{m.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDate(m.started_at, { weekday: "short" })} · {formatTime(m.started_at)} · {formatDuration(m.duration_seconds)}
                      </p>
                      {m.overview && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{m.overview}</p>}
                    </div>
                    <div className="hidden sm:block">
                      <AvatarStack participants={m.participants} max={3} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card
            title="My tasks"
            action={
              <Link href="/tasks" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                All tasks <ArrowRight className="size-3.5" />
              </Link>
            }
          >
            {tasks === undefined ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState icon={CircleCheckBig} title="You're all caught up" description="No open tasks assigned to you." />
            ) : (
              <div className="p-2">
                {tasks.slice(0, 5).map((t) => (
                  <ActionItemRow key={t.id} item={t} people={people} showMeeting onChanged={onTaskChanged} onDeleted={onTaskRemoved} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Personal assistant">
            <div className="grid gap-2 p-3">
              {[
                { icon: Sparkles, title: "Daily digest", text: "A morning recap of yesterday's meetings", feature: "askfred" as const },
                { icon: CalendarDays, title: "Meeting prep", text: "Briefings before your next calls", feature: "meeting-prep" as const },
              ].map(({ icon: Icon, title, text, feature }) => (
                <button
                  key={title}
                  onClick={() => showComingSoon(feature)}
                  className="flex items-center gap-3 rounded-lg p-2.5 text-left hover:bg-gray-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-pink-50 text-brand-pink">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{title}</span>
                    <span className="block text-xs text-gray-500">{text}</span>
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Soon</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Signed-in dashboard: loads the data and renders <DashboardContent>. */
export function HomeDashboard() {
  const { user } = useAuth();
  const meetings = useResource("home:meetings", () => api.meetings.list({ limit: 200 }));
  const lastWeek = useResource("home:week", () =>
    api.meetings.list({ date_from: new Date(Date.now() - WEEK_MS).toISOString(), limit: 1 }),
  );
  const tasks = useResource("home:tasks", () => api.actionItems.list({ completed: false }));
  const people = useResource("participants", api.participants.list);

  const myTasks = tasks.data?.filter((t) => user?.participant_id != null && t.assignee_id === user.participant_id);
  const items = meetings.data?.items;

  return (
    <DashboardContent
      heading={`${greeting()}${user ? `, ${user.name.split(" ")[0]}` : ""}`}
      meetings={items}
      meetingsError={meetings.error && !meetings.data ? { message: meetings.error.message, retry: meetings.reload } : undefined}
      stats={{
        lastWeek: lastWeek.data?.total,
        totalSeconds: items?.reduce((sum, m) => sum + m.duration_seconds, 0),
        openTasks: myTasks?.filter((t) => !t.is_completed).length,
      }}
      tasks={myTasks}
      people={people.data ?? []}
      onTaskChanged={(updated) => tasks.mutate((list) => list.map((t) => (t.id === updated.id ? updated : t)))}
      onTaskRemoved={(id) => tasks.mutate((list) => list.filter((t) => t.id !== id))}
    />
  );
}
