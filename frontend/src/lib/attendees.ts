import type { AttendeeInput, MeetingListItem } from "@/types/api";

const EMAIL = /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/;

export interface ParsedAttendees {
  attendees: AttendeeInput[];
  /** Human-readable problems, e.g. `Line 2: add a closing ">" after the email`. */
  errors: string[];
}

/**
 * One attendee per line: `Name`, `Name <email>` or `Name, email`. The first line is the host.
 * Mirrors the backend's validation so mistakes are caught before saving.
 */
export function parseAttendees(raw: string): ParsedAttendees {
  const attendees: AttendeeInput[] = [];
  const errors: string[] = [];

  raw.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const label = `Line ${index + 1}`;

    let name = line;
    let email: string | null = null;
    const angle = line.match(/^(.*?)<([^<>]*)>\s*$/);
    const comma = line.match(/^(.*?),\s*(\S+)\s*$/);
    if (angle) [, name, email] = angle;
    else if (comma) [, name, email] = comma;
    else if (line.includes("<")) {
      errors.push(`${label}: add a closing ">" after the email`);
      return;
    }

    name = name.trim();
    email = email?.trim().toLowerCase() || null;
    if (!name) errors.push(`${label}: add a name before the email`);
    else if (/[<>]/.test(name)) errors.push(`${label}: use the format Name <email>`);
    else if (email && !EMAIL.test(email)) errors.push(`${label}: "${email}" isn't a valid email`);
    else attendees.push({ name, email, role: attendees.length === 0 ? "host" : "attendee" });
  });

  return { attendees, errors };
}

export function formatAttendees(meeting: Pick<MeetingListItem, "participants">): string {
  const hostsFirst = [...meeting.participants].sort((a, b) => Number(b.role === "host") - Number(a.role === "host"));
  return hostsFirst.map((p) => (p.email ? `${p.name} <${p.email}>` : p.name)).join("\n");
}
