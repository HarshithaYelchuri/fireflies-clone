import type {
  ActionItem,
  ActionItemInput,
  AuthConfig,
  AuthResponse,
  ExportContent,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListItem,
  MeetingQuery,
  MeetingUpdateInput,
  Page,
  Participant,
  Profile,
  ProfileInput,
  SignupInput,
  Summary,
  SummaryInput,
} from "@/types/api";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

// ── Session token ───────────────────────────────────────────────────────────
// The API uses bearer tokens. The token lives in localStorage so it survives reloads; storage can be
// unavailable (private mode, blocked site data), so every access is guarded.

const TOKEN_KEY = "hersheys.session";
let memoryToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setAuthToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // fall back to the in-memory token
  }
}

/** Called when an authenticated request comes back 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** FastAPI returns `detail` as a string or as a list of validation errors. */
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  return fallback;
}

async function send(path: string, init: RequestInit & { query?: Query } = {}): Promise<Response> {
  const { query, ...rest } = init;
  let response: Response;
  try {
    const token = getAuthToken();
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Can't reach the API at ${API_URL}. Is the backend running?`, 0);
  }
  if (!response.ok) {
    if (response.status === 401 && getAuthToken() && !path.startsWith("/api/auth/")) onUnauthorized?.();
    const body = await response.json().catch(() => null);
    throw new ApiError(errorMessage(body, `Request failed (${response.status})`), response.status);
  }
  return response;
}

async function request<T>(path: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const response = await send(path, init);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Filename from a `Content-Disposition: attachment; filename="…"` header. */
function attachmentName(response: Response, fallback: string): string {
  return response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? fallback;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  meetings: {
    list: (query: MeetingQuery = {}) =>
      request<Page<MeetingListItem>>("/api/meetings", { query: query as Query }),
    get: (id: number) => request<MeetingDetail>(`/api/meetings/${id}`),
    create: (input: MeetingCreateInput) =>
      request<MeetingDetail>("/api/meetings", { method: "POST", body: json(input) }),
    update: (id: number, input: MeetingUpdateInput) =>
      request<MeetingDetail>(`/api/meetings/${id}`, { method: "PATCH", body: json(input) }),
    remove: (id: number) => request<void>(`/api/meetings/${id}`, { method: "DELETE" }),
    /** Generate the AI summary, keywords and outline from the transcript (adds action items if there are none). */
    generateNotes: (id: number) => request<MeetingDetail>(`/api/meetings/${id}/generate-notes`, { method: "POST" }),
    exportPdf: async (id: number, content: ExportContent) => {
      const response = await send(`/api/meetings/${id}/export.pdf`, { query: { content } });
      return { blob: await response.blob(), filename: attachmentName(response, `meeting-${id}-${content}.pdf`) };
    },
  },
  summary: {
    save: (meetingId: number, input: SummaryInput) =>
      request<Summary>(`/api/meetings/${meetingId}/summary`, { method: "PUT", body: json(input) }),
  },
  actionItems: {
    list: (query: { completed?: boolean; assignee_id?: number; meeting_id?: number } = {}) =>
      request<ActionItem[]>("/api/action-items", { query }),
    create: (meetingId: number, input: ActionItemInput & { text: string }) =>
      request<ActionItem>(`/api/meetings/${meetingId}/action-items`, { method: "POST", body: json(input) }),
    update: (id: number, input: ActionItemInput) =>
      request<ActionItem>(`/api/action-items/${id}`, { method: "PATCH", body: json(input) }),
    remove: (id: number) => request<void>(`/api/action-items/${id}`, { method: "DELETE" }),
  },
  participants: {
    list: () => request<Participant[]>("/api/participants"),
  },
  auth: {
    config: () => request<AuthConfig>("/api/auth/config"),
    signup: (input: SignupInput) => request<AuthResponse>("/api/auth/signup", { method: "POST", body: json(input) }),
    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", { method: "POST", body: json({ email, password }) }),
    google: (credential: string) =>
      request<AuthResponse>("/api/auth/google", { method: "POST", body: json({ credential }) }),
    me: () => request<Profile>("/api/auth/me"),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  },
  profile: {
    get: () => request<Profile>("/api/profile"),
    update: (input: ProfileInput) => request<Profile>("/api/profile", { method: "PATCH", body: json(input) }),
  },
};
