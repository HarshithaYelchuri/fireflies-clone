"use client";

import { Plus, Search, Upload, Video, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useComingSoon } from "@/components/common/coming-soon";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import { SelectField } from "@/components/common/select-field";
import { MeetingFormDialog } from "@/components/meeting/meeting-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { dateGroupLabel } from "@/lib/format";
import { PLATFORM_OPTIONS } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { MeetingListItem, MeetingQuery, MeetingSort, Platform, SortOrder } from "@/types/api";

import { MeetingRow } from "./meeting-row";

const PAGE_SIZE = 20;
const ALL = "all";

const SORTS: Record<string, { label: string; sort: MeetingSort; order: SortOrder }> = {
  newest: { label: "Newest first", sort: "date", order: "desc" },
  oldest: { label: "Oldest first", sort: "date", order: "asc" },
  "title-asc": { label: "Title A–Z", sort: "title", order: "asc" },
  "title-desc": { label: "Title Z–A", sort: "title", order: "desc" },
  longest: { label: "Longest", sort: "duration", order: "desc" },
  shortest: { label: "Shortest", sort: "duration", order: "asc" },
};

const RANGES: Record<string, { label: string; days?: number }> = {
  [ALL]: { label: "Any time" },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
};

/** Filters live in the URL so they survive navigation and can be shared. */
function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    q: params.get("q") ?? "",
    scope: params.get("scope") === "title" ? "title" : ALL,
    participant: params.get("participant") ?? ALL,
    platform: params.get("platform") ?? ALL,
    range: params.get("range") ?? ALL,
    sort: params.get("sort") && params.get("sort")! in SORTS ? params.get("sort")! : "newest",
    starred: params.get("starred") === "1",
  };

  const update = (patch: Partial<Record<keyof typeof filters, string | boolean>>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      const isDefault = value === "" || value === ALL || value === false || (key === "sort" && value === "newest");
      if (isDefault) next.delete(key);
      else next.set(key, value === true ? "1" : String(value));
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return { filters, update };
}

function toQuery(filters: ReturnType<typeof useFilters>["filters"], limit: number): MeetingQuery {
  const { sort, order } = SORTS[filters.sort];
  const days = RANGES[filters.range]?.days;
  return {
    q: filters.q || undefined,
    search_in: filters.q && filters.scope === "title" ? "title" : undefined,
    participant_id: filters.participant !== ALL ? Number(filters.participant) : undefined,
    platform: filters.platform !== ALL ? (filters.platform as Platform) : undefined,
    starred: filters.starred || undefined,
    date_from: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
    sort,
    order,
    limit,
  };
}

function ListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MeetingsLibrary() {
  const router = useRouter();
  const showComingSoon = useComingSoon();
  const { filters, update } = useFilters();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [creating, setCreating] = useState<"form" | "upload" | null>(null);

  // Local search box state, kept in sync with ?q= (which the top bar's global search also sets).
  const [search, setSearch] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  const [pushedQ, setPushedQ] = useState<string | null>(null);
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    // Only adopt external changes; our own debounced push must not clobber newer keystrokes.
    if (filters.q === pushedQ) setPushedQ(null);
    else setSearch(filters.q);
  }
  useEffect(() => {
    const q = search.trim();
    if (q === filters.q) return;
    const timer = setTimeout(() => {
      setPushedQ(q);
      update({ q });
    }, 300);
    return () => clearTimeout(timer);
  });

  const query = toQuery(filters, limit);
  const { data, error, loading, initialLoading, reload, mutate } = useResource(
    `meetings:${JSON.stringify({ ...filters, limit })}`,
    () => api.meetings.list(query),
  );
  const { data: people } = useResource("participants", api.participants.list);

  const items = data?.items ?? [];
  const hasFilters = !!(filters.q || filters.participant !== ALL || filters.platform !== ALL || filters.range !== ALL || filters.starred);
  const groupByDate = SORTS[filters.sort].sort === "date";

  const changeItem = (updated: MeetingListItem) =>
    mutate((page) => ({ ...page, items: page.items.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)) }));
  const removeItem = (id: number) =>
    mutate((page) => ({ items: page.items.filter((m) => m.id !== id), total: page.total - 1 }));

  const groups: { label: string | null; items: MeetingListItem[] }[] = [];
  for (const meeting of items) {
    const label = groupByDate ? dateGroupLabel(meeting.started_at) : null;
    if (groups.at(-1)?.label === label) groups.at(-1)!.items.push(meeting);
    else groups.push({ label, items: [meeting] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `${data.total} meeting${data.total === 1 ? "" : "s"}` : "Your notebook of recorded conversations"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-3" onClick={() => setCreating("upload")}>
            <Upload /> Upload
          </Button>
          <Button className="h-9 px-3" onClick={() => setCreating("form")}>
            <Plus /> New meeting
          </Button>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="mt-6 flex gap-1 border-b">
        {[
          { label: "All meetings", active: !filters.starred, onClick: () => update({ starred: false }) },
          { label: "Starred", active: filters.starred, onClick: () => update({ starred: true }) },
          { label: "Shared with me", active: false, onClick: () => showComingSoon("team") },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={tab.onClick}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
              tab.active ? "border-brand-500 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, transcripts, notes"
            aria-label="Search meetings"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-8 pl-9 text-sm outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600">
              <X className="size-4" />
            </button>
          )}
        </div>
        <SelectField
          aria-label="Search in"
          value={filters.scope}
          onChange={(scope) => update({ scope })}
          options={[
            { value: ALL, label: "Search everything" },
            { value: "title", label: "Titles only" },
          ]}
        />
        <SelectField
          aria-label="Filter by participant"
          value={filters.participant}
          onChange={(participant) => update({ participant })}
          options={[{ value: ALL, label: "All participants" }, ...(people ?? []).map((p) => ({ value: String(p.id), label: p.name }))]}
        />
        <SelectField
          aria-label="Filter by platform"
          value={filters.platform}
          onChange={(platform) => update({ platform })}
          options={[{ value: ALL, label: "All platforms" }, ...PLATFORM_OPTIONS]}
        />
        <SelectField
          aria-label="Filter by date"
          value={filters.range}
          onChange={(range) => update({ range })}
          options={Object.entries(RANGES).map(([value, { label }]) => ({ value, label }))}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          {hasFilters && (
            <button
              onClick={() => update({ q: "", scope: ALL, participant: ALL, platform: ALL, range: ALL, starred: false })}
              className="text-sm font-medium text-gray-500 hover:text-brand-600"
            >
              Clear filters
            </button>
          )}
          <SelectField
            aria-label="Sort meetings"
            value={filters.sort}
            onChange={(sort) => update({ sort })}
            options={Object.entries(SORTS).map(([value, { label }]) => ({ value, label }))}
          />
        </div>
      </div>

      <div className={cn("mt-4 overflow-hidden rounded-xl border bg-white shadow-xs transition-opacity", loading && !initialLoading && "opacity-60")}>
        {initialLoading ? (
          <ListSkeleton />
        ) : error && !data ? (
          <div className="p-4">
            <ErrorState message={error.message} onRetry={reload} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? Search : Video}
            title={hasFilters ? "No meetings match your filters" : "No meetings yet"}
            description={hasFilters ? "Try a different search term or clear the filters." : "Create a meeting to get started."}
            action={
              hasFilters ? undefined : (
                <Button onClick={() => setCreating("form")}>
                  <Plus /> New meeting
                </Button>
              )
            }
          />
        ) : (
          groups.map((group, i) => (
            <div key={`${group.label}-${i}`}>
              {group.label && (
                <p className="border-b bg-gray-50 px-5 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{group.label}</p>
              )}
              {group.items.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} query={filters.q} onChanged={changeItem} onDeleted={removeItem} />
              ))}
            </div>
          ))
        )}
      </div>

      {data && data.total > items.length && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)} disabled={loading}>
            {loading ? "Loading…" : `Load more (${data.total - items.length} remaining)`}
          </Button>
        </div>
      )}

      <MeetingFormDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        mode={creating ?? "form"}
        onSaved={(m) => router.push(`/meetings/${m.id}`)}
      />
    </div>
  );
}
