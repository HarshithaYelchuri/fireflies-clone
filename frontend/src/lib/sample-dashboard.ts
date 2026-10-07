import type { ActionItem, Attendee, MeetingListItem } from "@/types/api";

/**
 * Static sample data for the landing-page dashboard preview (visitors aren't signed in, so the API
 * can't be called). Mirrors the backend's seeded demo meetings.
 */

const person = (id: number, name: string, role: Attendee["role"] = "attendee"): Attendee => ({ id, name, email: null, role });
const PRIYA = person(1, "Priya Raman", "host");
const MARCUS = person(2, "Marcus Chen");
const SOFIA = person(3, "Sofia Alvarez");
const LIAM = person(4, "Liam Foster");
const DANIEL = person(5, "Daniel Okafor", "host");
const EMILY = person(6, "Emily Park");
const JORDAN = person(9, "Jordan Blake");
const HANNAH = person(7, "Hannah Lee");
const RAVI = person(8, "Ravi Patel");

const meeting = (
  id: number,
  title: string,
  platform: MeetingListItem["platform"],
  started_at: string,
  minutes: number,
  participants: Attendee[],
  overview: string,
): MeetingListItem => ({
  id,
  title,
  description: null,
  platform,
  started_at,
  duration_seconds: minutes * 60,
  is_starred: false,
  participants,
  keywords: [],
  overview,
  action_items_count: 0,
  open_action_items_count: 0,
});

export const SAMPLE_MEETINGS: MeetingListItem[] = [
  meeting(1, "Q4 Product Roadmap Planning", "google_meet", "2026-10-06T09:30:00Z", 46, [PRIYA, MARCUS, SOFIA, LIAM],
    "The team agreed on the Q4 roadmap. The analytics dashboard is the top priority and launches on November 18."),
  meeting(5, "Brightwave — Discovery Call", "zoom", "2026-10-05T14:00:00Z", 38, [DANIEL, EMILY, JORDAN],
    "Brightwave is losing track of decisions made in meetings. Both sides agreed on a two-week pilot with the ops leads."),
  meeting(2, "Weekly Engineering Standup", "microsoft_teams", "2026-10-04T10:00:00Z", 22, [MARCUS, HANNAH, PRIYA, RAVI],
    "The analytics query layer is complete and in staging behind a feature flag. Webhook retries move to Redis."),
  meeting(4, "Website Redesign Kickoff", "zoom", "2026-09-30T16:00:00Z", 51, [SOFIA, LIAM, PRIYA],
    "The team kicked off the website redesign with three goals: conversion, positioning and mobile speed."),
  meeting(3, "Interview: Senior Frontend Engineer", "google_meet", "2026-09-27T11:00:00Z", 45, [MARCUS, SOFIA],
    "Strong React and performance experience. The panel recommended moving to the final round."),
];

const task = (id: number, text: string, due_date: string, meeting_id: number, meeting_title: string, done = false): ActionItem => ({
  id,
  meeting_id,
  meeting_title,
  text,
  assignee_id: PRIYA.id,
  assignee: { id: PRIYA.id, name: PRIYA.name, email: null },
  due_date,
  is_completed: done,
  timestamp: null,
  created_at: "2026-10-06T10:00:00Z",
  updated_at: "2026-10-06T10:00:00Z",
});

export const SAMPLE_TASKS: ActionItem[] = [
  task(1, "Share the updated Q4 roadmap with leadership", "2026-10-07", 1, "Q4 Product Roadmap Planning"),
  task(2, "Review the Brightwave pilot plan with Emily", "2026-10-09", 5, "Brightwave — Discovery Call"),
  task(3, "Approve the homepage messaging brief", "2026-10-14", 4, "Website Redesign Kickoff"),
];

export const SAMPLE_STATS = { lastWeek: 6, totalSeconds: 4 * 3600 + 22 * 60, openTasks: 3 };
