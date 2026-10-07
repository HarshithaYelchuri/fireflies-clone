"use client";

import { CircleCheckBig, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ActionItemDialog } from "@/components/action-items/action-item-dialog";
import { ActionItemRow } from "@/components/action-items/action-item-row";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { describeDueDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/types/api";

type Status = "open" | "completed" | "all";
const ANYONE = "all";
const ME = "me";

/** Open items first; within a group, earliest due date first and undated items last. */
function compareTasks(a: ActionItem, b: ActionItem): number {
  if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
  if (a.due_date !== b.due_date) return !a.due_date ? 1 : !b.due_date ? -1 : a.due_date.localeCompare(b.due_date);
  return b.created_at.localeCompare(a.created_at);
}

function dueGroup(item: ActionItem): string {
  if (item.is_completed) return "Completed";
  if (!item.due_date) return "No due date";
  const { overdue } = describeDueDate(item.due_date);
  return overdue ? "Overdue" : "Upcoming";
}

export function TasksBoard() {
  const tasks = useResource("tasks", () => api.actionItems.list());
  const people = useResource("participants", api.participants.list);
  const meetings = useResource("tasks:meetings", () => api.meetings.list({ limit: 200 }));
  const [status, setStatus] = useState<Status>("open");
  const [assignee, setAssignee] = useState<string>(ANYONE);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const meId = useAuth().user?.participant_id ?? undefined;
  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const counts = {
    open: all.filter((t) => !t.is_completed).length,
    completed: all.filter((t) => t.is_completed).length,
    all: all.length,
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const assigneeId = assignee === ME ? (meId ?? -1) : assignee === ANYONE ? undefined : Number(assignee);
    return all
      .filter((t) => status === "all" || (status === "completed") === t.is_completed)
      .filter((t) => assigneeId === undefined || t.assignee_id === assigneeId)
      .filter((t) => !needle || t.text.toLowerCase().includes(needle) || t.meeting_title.toLowerCase().includes(needle))
      .sort(compareTasks);
  }, [all, status, assignee, meId, search]);

  const groups = useMemo(() => {
    const map = new Map<string, ActionItem[]>();
    for (const item of visible) map.set(dueGroup(item), [...(map.get(dueGroup(item)) ?? []), item]);
    return [...map.entries()];
  }, [visible]);

  const changeTask = (updated: ActionItem) => tasks.mutate((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  const removeTask = (id: number) => tasks.mutate((list) => list.filter((t) => t.id !== id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">Action items captured across all of your meetings.</p>
        </div>
        <Button className="h-9 px-3" onClick={() => setCreating(true)} disabled={!meetings.data?.items.length}>
          <Plus /> New task
        </Button>
      </div>

      <div className="mt-6 flex gap-1 border-b">
        {(["open", "completed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-medium capitalize transition-colors",
              status === s ? "border-brand-500 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {s}
            <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <SelectField
          aria-label="Filter by assignee"
          value={assignee}
          onChange={setAssignee}
          options={[
            { value: ANYONE, label: "Anyone" },
            { value: ME, label: "Assigned to me" },
            ...(people.data ?? []).filter((p) => p.id !== meId).map((p) => ({ value: String(p.id), label: p.name })),
          ]}
        />
      </div>

      <div className="mt-4 rounded-xl border bg-white p-2 shadow-xs">
        {tasks.initialLoading ? (
          <div className="space-y-3 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : tasks.error && !tasks.data ? (
          <ErrorState message={tasks.error.message} onRetry={tasks.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title={status === "open" && !search && assignee === ANYONE ? "You're all caught up" : "No tasks found"}
            description="Action items from your meetings show up here."
          />
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-2 last:mb-0">
              <p className={cn("px-3 pt-2 pb-1 text-xs font-semibold tracking-wide uppercase", label === "Overdue" ? "text-red-600" : "text-gray-400")}>
                {label} · {items.length}
              </p>
              {items.map((item) => (
                <ActionItemRow key={item.id} item={item} people={people.data ?? []} showMeeting onChanged={changeTask} onDeleted={removeTask} />
              ))}
            </div>
          ))
        )}
      </div>

      <ActionItemDialog
        open={creating}
        onOpenChange={setCreating}
        people={people.data ?? []}
        meetings={meetings.data?.items.map(({ id, title }) => ({ id, title }))}
        onSaved={(item) => tasks.mutate((list) => [item, ...list])}
      />
    </div>
  );
}
