/** Types mirroring the FastAPI schemas in backend/app/schemas.py. */

export type Platform = "zoom" | "google_meet" | "microsoft_teams" | "webex" | "upload";
export type Role = "host" | "attendee";

export interface Participant {
  id: number;
  name: string;
  email: string | null;
}

export interface Attendee extends Participant {
  role: Role;
}

export interface TranscriptSegment {
  id: number;
  meeting_id: number;
  speaker_id: number | null;
  speaker: Participant | null;
  start_time: number;
  end_time: number;
  text: string;
}

export interface Summary {
  id: number;
  meeting_id: number;
  overview: string;
  bullet_points: string[];
  keywords: string[];
  updated_at: string;
}

export interface Topic {
  id: number;
  meeting_id: number;
  title: string;
  summary: string;
  start_time: number;
  end_time: number;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  meeting_title: string;
  text: string;
  assignee_id: number | null;
  assignee: Participant | null;
  due_date: string | null; // YYYY-MM-DD
  is_completed: boolean;
  timestamp: number | null;
  created_at: string;
  updated_at: string;
}

/** Why a meeting matched the library search (absent when there's no search term). */
export interface SearchMatch {
  field: "title" | "description" | "transcript" | "overview" | "keywords";
  snippet: string;
  start_time: number | null;
}

export interface MeetingListItem {
  id: number;
  title: string;
  description: string | null;
  platform: Platform;
  started_at: string;
  duration_seconds: number;
  is_starred: boolean;
  participants: Attendee[];
  keywords: string[];
  overview: string | null;
  action_items_count: number;
  open_action_items_count: number;
  match?: SearchMatch | null;
}

export interface MeetingDetail extends MeetingListItem {
  media_url: string | null;
  created_at: string;
  updated_at: string;
  segments: TranscriptSegment[];
  summary: Summary | null;
  topics: Topic[];
  action_items: ActionItem[];
}

export interface Page<T> {
  items: T[];
  total: number;
}

export type MeetingSort = "date" | "title" | "duration";
export type SortOrder = "asc" | "desc";
export type SearchScope = "all" | "title";
export type ExportContent = "summary" | "transcript";

export interface MeetingQuery {
  q?: string;
  search_in?: SearchScope;
  participant_id?: number;
  platform?: Platform;
  starred?: boolean;
  date_from?: string;
  date_to?: string;
  sort?: MeetingSort;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface AttendeeInput {
  name: string;
  email?: string | null;
  role?: Role;
}

export interface TranscriptLineInput {
  speaker_name: string;
  start_time: number;
  text: string;
}

export interface MeetingCreateInput {
  title: string;
  description?: string | null;
  platform: Platform;
  started_at: string;
  duration_seconds?: number | null;
  participants: AttendeeInput[];
  transcript: TranscriptLineInput[];
}

export type MeetingUpdateInput = Partial<Omit<MeetingCreateInput, "transcript">> & {
  is_starred?: boolean;
};

export interface ActionItemInput {
  text?: string;
  assignee_id?: number | null;
  due_date?: string | null;
  is_completed?: boolean;
  timestamp?: number | null;
}

export interface SummaryInput {
  overview: string;
  bullet_points: string[];
  keywords: string[];
}

export type Language = "en" | "es" | "fr" | "de" | "hi";

/** The signed-in user's account profile and preferences. */
export interface Profile {
  id: number;
  name: string;
  email: string;
  job_title: string;
  language: Language;
  email_recap: boolean;
  task_notifications: boolean;
  weekly_digest: boolean;
  workspace: string;
  plan: string;
  /** Participant record representing this user (matched by email), used for "my tasks". */
  participant_id: number | null;
  has_password: boolean;
  google_linked: boolean;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: Profile;
}

export interface AuthConfig {
  /** OAuth client ID for Google sign-in; null when the server hasn't configured it. */
  google_client_id: string | null;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export type ProfileInput = Partial<
  Pick<Profile, "name" | "email" | "job_title" | "language" | "email_recap" | "task_notifications" | "weekly_digest">
>;
