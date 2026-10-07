<p align="center"><img src="frontend/public/brand/hersheys-logo.png" alt="Hersheys.ai" width="220"></p>

# Hersheys.ai: Meeting Notes Workspace

**Hersheys.ai** is a full-stack web app. It includes a meetings library, a meeting page with a speaker-labelled, timestamped transcript synced to a media player, AI notes (keywords, overview, bullet notes), a time-stamped outline (topics/chapters), and action items. All of this data is persisted in SQLite behind a FastAPI REST API.

```
fireflies-assignment/
├── frontend/   Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI)
└── backend/    Python · FastAPI · SQLAlchemy 2 · SQLite
```

---

## Quick start

**Prerequisites:** Python 3.11+ and Node.js 24+ (see `frontend/.nvmrc`).

### 1. Backend (http://localhost:8000)

```bash
cd backend
python -m venv .venv
# macOS/Linux: source .venv/bin/activate     Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt          # runtime deps + pytest/httpx
cp .env.example .env                         # optional, defaults work as-is
uvicorn app.main:app --reload --reload-dir app --port 8000   # watch app/ only, not .venv
```

On first start the tables are created and the demo meetings are seeded automatically (`AUTO_SEED=true`).
Interactive API docs: http://localhost:8000/docs.

### 2. Frontend (http://localhost:3000)

```bash
cd frontend
npm install
cp .env.example .env.local                   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### 3. Sign in

Open http://localhost:3000. You land on the public landing page (`/`). **Get Started** goes to sign-up and **Sign In** to sign-in; both continue to the dashboard (`/dashboard`).

- **Demo account:** `priya@lumenlabs.io` / `demo1234`. Click **Explore with the demo account** on the sign-in page, or **Explore Demo** on the landing page.
- **Email sign-up:** creates a real account (password hashed with PBKDF2).
- **Google sign-in:** optional. See [Google sign-in setup](#google-sign-in-setup).

### 4. Checks

```bash
cd backend && pytest                         # API tests (isolated temporary SQLite DB)
cd frontend && npm run check                 # eslint + tsc + production build
```

---

## Features

| Area | What's implemented |
| --- | --- |
| **Landing page** | Public marketing page at `/`: sticky navbar (Product, Features, About, Sign In, Get Started) with a mobile menu, hero ("Turn Every Meeting Into Momentum.") with an original product illustration, a **live preview of the real dashboard** (the actual `DashboardContent`, sidebar and top bar rendered with sample data in a browser frame), four feature cards, an About section, a closing CTA and a footer with Privacy and Terms pages. Subtle scroll-reveal and hover motion, respecting reduced-motion settings. |
| **Authentication** | `/signup` and `/login` with **Continue with Google**, email and password, and a one-click demo account. Sessions use bearer tokens; the app routes (`/dashboard`, `/meetings`, `/tasks`, `/settings`, …) and the workspace API require sign-in. Signed-out visits redirect to `/login?next=…` and return afterwards; **Sign out** returns to the landing page. |
| **Layout & navigation** | Fireflies-style app shell: collapsible left sidebar (Home, AskFred, Meetings, Tasks, Uploads, AI Skills, Analytics, Voice Agents, Integrations, Settings), mobile drawer, top bar with global meeting search (`Ctrl/⌘ K`), Invite, **Capture**, notifications and a profile menu. Fireflies palette (violet `#7a5af8`, pink `#e82a73`) and typography (Inter + DM Sans). |
| **Dashboard** (`/dashboard`) | Greeting, "Add Fred to a live meeting" capture banner, stats, recent meetings, my open tasks, personal assistant cards. |
| **Meetings library** | Server-side search across titles, descriptions, transcript text, overviews and keywords, or **titles only**. Each result shows *why* it matched (e.g. "Transcript · 1:48 … customer **interview**s …"), and the snippet opens the meeting at that moment with the transcript search pre-filled. Filters for participant, platform, date range and starred; six sort orders; date-grouped list (Today / Yesterday / This week …); search-term highlighting; star toggle; "load more" pagination. Filter state lives in the URL, so it survives navigation. |
| **AI notes** | Creating a meeting with a transcript (pasted, uploaded or via the API) **generates notes automatically**: keywords, an overview, attributed notes, chapters (topics) and action items with assignees and due dates ("Ben, can you … by Friday" → Ben, next Friday). Meetings without notes get a **Generate notes** button, and **Regenerate** rebuilds the summary and outline (existing action items are kept, never duplicated). See [AI notes generator](#ai-notes-generator). |
| **Meeting page** | Header (platform, date, duration, attendees, star, share, download, edit, delete). AI notes tabs for **Summary** (keywords, overview, notes, speaker talk time), **Action items** and **Outline** (topics/chapters). Media preview showing the current speaker, a transcript panel and a sticky player bar. |
| **Transcript ↔ player sync** | Clicking a transcript line, chapter or action-item timestamp seeks and plays from there. During playback the active line is highlighted and auto-scrolled into view; scrolling by hand pauses auto-follow and offers "Resume auto-scroll". The scrubber shows who spoke when (speaker colours) and chapter markers. Speed control 0.75×–2×, ±15 s skip, keyboard shortcuts (`Space`, `←`/`→`). Deep links such as `/meetings/3?t=95` start at a given moment. |
| **Transcript search** | Highlights every match, shows a `n / total` counter, and steps through matches with `Enter` / `Shift+Enter` or the arrow buttons. The current match is emphasised and scrolled into view. Copy-transcript button. |
| **CRUD** | Meetings: create via the form, by pasting a `[mm:ss] Speaker: text` transcript, or by **uploading a `.txt`, `.vtt` (WebVTT) or `.srt` file** (Upload button, browse or drag-and-drop; speakers become participants). Edit details/attendees with inline validation (e.g. `Line 5: add a closing ">" after the email`), star, delete. Action items: create (optionally linked to the current playback moment), edit text/assignee/due date, complete/reopen, delete. AI notes: edit keywords, overview and bullet notes. |
| **Tasks** | Every action item across meetings, with Open / Completed / All tabs, assignee filter, search, grouping by Overdue / Upcoming / No due date, and links back to the exact moment in the meeting. |
| **Feedback** | Toasts for every mutation and error, confirmation modals for destructive actions, skeleton loaders, empty and error states with retry. |
| **Export** | Download a meeting's AI notes (keywords, overview, notes, outline, action items) or its full transcript as a **PDF**. The file is generated by the API. |
| **Settings** | Profile (name, email, job title) and preferences (email recap, task notifications, weekly digest, transcription language) are **persisted** through `/api/profile`. The top bar, greeting and "My tasks" follow the saved profile. |
| **Placeholders** | Polished "Coming soon" pages and dialogs for everything out of scope (see below). |

---

## Architecture

```
┌──────────────────────── Browser ─────────────────────────┐
│ Next.js App Router (client components for interactivity)  │
│  app/(marketing) /  landing · /privacy · /terms (public)   │
│  app/(auth)      /login · /signup (public)                 │
│  app/(app)       /dashboard /meetings /tasks /settings …   │
│                  (behind <RequireAuth>, in the app shell)  │
│  components/     layout · meeting · meetings · tasks · ... │
│  hooks/          useResource (fetch), usePlayback (clock)  │
│  lib/api.ts      typed REST client  ──────────────┐        │
└───────────────────────────────────────────────────┼────────┘
                                   JSON over HTTP   │  (CORS)
┌───────────────────────────────────────────────────▼────────┐
│ FastAPI                                                    │
│  routers/   meetings · transcript · summaries · topics ·   │
│             action_items · participants · profile · auth   │
│  auth.py    passwords, bearer sessions, Google ID tokens   │
│  pdf.py     PDF export of notes / transcript (fpdf2)       │
│  schemas.py Pydantic request/response models + validation  │
│  services.py domain logic: queries, search, attendee       │
│             matching, transcript timing                    │
│  models.py  SQLAlchemy ORM models  ──►  SQLite (fireflies.db)│
│  seed/      demo dataset + idempotent seeder / CLI         │
└────────────────────────────────────────────────────────────┘
```

### Frontend

- **Data fetching:** a small `useResource(key, fetcher)` hook (`src/hooks/use-resource.ts`) with keyed refetching, stale-while-loading and local `mutate` for optimistic updates. The fetching needs are modest, so this avoids adding a data-fetching library.
- **API client:** `src/lib/api.ts` is the only place that talks HTTP. Types in `src/types/api.ts` mirror the backend's Pydantic schemas.
- **Playback and sync:** the seed data has no recordings, so `usePlayback` (`src/hooks/use-playback.ts`) is a simulated media element: a `requestAnimationFrame` clock with play/pause, seek, skip and rate. It exposes the same surface a real `<audio>`/`<video>` would, so the sync code doesn't depend on which one drives it. The active transcript line is found by binary search over segments sorted by start time (`findActiveSegmentIndex` in `src/lib/transcript.ts`). Transcript rows are memoised, so a frame only re-renders rows whose active state changed.
- **Components:** `components/ui` holds the shadcn/Base UI primitives. Feature folders (`meeting/`, `meetings/`, `action-items/`, `tasks/`, `home/`, `settings/`, `layout/`, `common/`) hold the app components. Out-of-scope features come from a single registry (`src/lib/features.ts`) rendered by `ComingSoonPage` / `useComingSoon()`.

### Backend

- **Layering:** routers handle HTTP concerns only (status codes, query params). `services.py` holds reusable domain logic: the search query, participant matching, attendee replacement and transcript timing. Pydantic schemas validate input (for example `end_time ≥ start_time`, non-negative timestamps) and normalise datetimes to UTC ISO-8601 with a `Z` suffix.
- **Database lifecycle:** tables are created on startup (`init_db`). SQLite foreign keys are switched on per connection, so `ON DELETE CASCADE` / `SET NULL` are enforced by the database as well as the ORM.
- **N+1 safety:** list and detail endpoints eager-load relationships (`selectinload` / `joinedload`).

---

## API overview

Base URL `http://localhost:8000`. Full OpenAPI docs are at `/docs`. All bodies are JSON.

Everything except `/api/health` and `/api/auth/*` requires `Authorization: Bearer <token>`, where the token comes from sign-up or sign-in. Without it the API returns `401`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| **Auth** | | |
| GET | `/api/auth/config` | Public sign-in settings: `{google_client_id}` (null when Google isn't configured) |
| POST | `/api/auth/signup` | `{name, email, password (≥8)}` → `{token, user}`; `409` if the email is taken |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}`; `401` on bad credentials |
| POST | `/api/auth/google` | `{credential}` (Google ID token) → `{token, user}`. Links to an existing account with the same verified email, or creates one |
| POST | `/api/auth/logout` | Ends the current session |
| GET | `/api/auth/me` | The signed-in user |
| **Meetings** | | |
| GET | `/api/meetings` | List meetings → `{items, total}`. Query: `q` (title, description, transcript, overview, keywords), `search_in` (`all`\|`title`), `participant_id`, `platform`, `starred`, `date_from`, `date_to`, `sort` (`date`\|`title`\|`duration`), `order` (`asc`\|`desc`), `limit` (≤200), `offset` |
| POST | `/api/meetings` | Create a meeting, optionally with `participants[]` and `transcript[]` (`speaker_name`, `start_time`, `text`). Speakers are matched to or created as participants, and `duration_seconds` is inferred if omitted |
| GET | `/api/meetings/{id}` | Full meeting: attendees, segments, summary, topics, action items |
| PATCH | `/api/meetings/{id}` | Partial update (title, description, platform, started_at, duration, media_url, is_starred; `participants` replaces the attendee list) |
| DELETE | `/api/meetings/{id}` | Delete the meeting and everything it owns |
| POST | `/api/meetings/{id}/generate-notes` | Generate the summary, keywords and outline from the transcript (replacing the current ones); adds action items only if the meeting has none. `422` without a transcript. `POST /api/meetings` with a `transcript` does this automatically |
| GET | `/api/meetings/{id}/export.pdf` | PDF download. Query: `content` = `summary` (AI notes, outline, action items) or `transcript` |
| **Transcript** | | |
| GET / POST | `/api/meetings/{id}/segments` | List / add transcript segments |
| PATCH / DELETE | `/api/segments/{segment_id}` | Edit / remove a segment |
| **Summary (AI notes)** | | |
| GET / PUT / DELETE | `/api/meetings/{id}/summary` | Read / upsert / remove `{overview, bullet_points[], keywords[]}` |
| **Topics (chapters)** | | |
| GET / POST | `/api/meetings/{id}/topics` | List / add topics `{title, summary, start_time, end_time}` |
| PATCH / DELETE | `/api/topics/{topic_id}` | Edit / remove a topic |
| **Action items** | | |
| GET | `/api/action-items` | Across all meetings. Query: `meeting_id`, `assignee_id`, `completed`, `limit` |
| POST | `/api/meetings/{id}/action-items` | Create `{text, assignee_id?, due_date?, is_completed?, timestamp?}` |
| GET / PATCH / DELETE | `/api/action-items/{item_id}` | Read / partial update / delete |
| **Participants** | | |
| GET / POST | `/api/participants` | List (query `q`) / create `{name, email?}` (email unique, case-insensitive) |
| GET / PATCH / DELETE | `/api/participants/{id}` | Read / update / delete |
| **Profile** | | |
| GET / PATCH | `/api/profile` | The signed-in user's profile and preferences; `participant_id` links it to a participant by email. `409` if the new email is taken |

When `q` is given, each list item also carries `match: {field, snippet, start_time}` explaining why it matched.

Errors use FastAPI's standard shape: `404 {"detail": "Meeting 7 not found"}` and `422` for validation errors (for example an invalid email, or a name that still contains `<email`). Unexpected errors return a JSON `500` that still has CORS headers, so the browser shows the real error instead of a network failure.

---

## Database schema

```
participants ─────────────< meeting_participants >───────────── meetings
     │  (1) ── speaks ──< transcript_segments >── (1)              │
     │  (1) ── owns ────< action_items >───────── (1)              │
     │                                                             ├──1:1── summaries
     │                                                             └──1:N── topics
```

| Table | Columns | Notes |
| --- | --- | --- |
| `participants` | `id` PK, `name`, `email` UNIQUE NULL, `created_at`, `updated_at` | A person, reused across meetings (matched by email, otherwise by name) |
| `meetings` | `id` PK, `title` (indexed), `description`, `platform`, `started_at` (indexed), `duration_seconds`, `media_url`, `is_starred`, `created_at`, `updated_at` | `platform` ∈ zoom, google_meet, microsoft_teams, webex, upload |
| `meeting_participants` | `meeting_id` FK→meetings CASCADE, `participant_id` FK→participants CASCADE (indexed), `role` | Composite PK (`meeting_id`, `participant_id`). Many-to-many association carrying the attendee's role (`host` / `attendee`) |
| `transcript_segments` | `id` PK, `meeting_id` FK CASCADE, `speaker_id` FK→participants SET NULL, `start_time`, `end_time`, `text` | Composite index (`meeting_id`, `start_time`) for ordered reads. Times are seconds from meeting start |
| `summaries` | `id` PK, `meeting_id` FK CASCADE UNIQUE, `overview`, `bullet_points` JSON, `keywords` JSON, `updated_at` | One per meeting. The lists are ordered and only ever read together with their summary, so they are JSON columns rather than extra tables |
| `topics` | `id` PK, `meeting_id` FK CASCADE (indexed), `title`, `summary`, `start_time`, `end_time` | Chapters / time-stamped outline |
| `action_items` | `id` PK, `meeting_id` FK CASCADE (indexed), `text`, `assignee_id` FK→participants SET NULL, `due_date` DATE, `is_completed` (indexed), `timestamp`, `created_at`, `updated_at` | `timestamp` links the task to the moment in the meeting it came from |
| `users` | `id` PK, `name`, `email` UNIQUE, `password_hash` NULL, `google_sub` UNIQUE NULL, `job_title`, `workspace`, `plan`, `language`, `email_recap`, `task_notifications`, `weekly_digest`, `created_at`, `updated_at` | Accounts with their profile and preferences. `password_hash` is PBKDF2-SHA256 (NULL for Google-only accounts); `google_sub` is the Google account ID. Linked to `participants` by email (for "My tasks") rather than by foreign key |
| `auth_sessions` | `id` PK, `user_id` FK→users CASCADE (indexed), `token_hash` UNIQUE, `created_at`, `expires_at` | One row per signed-in session. Only the SHA-256 of the bearer token is stored |

**Relationship rules**
- Deleting a meeting cascades to its attendances, segments, summary, topics and action items.
- Deleting a participant keeps the history: transcript lines become "Unknown speaker" and action items become unassigned (`SET NULL`).
- Times are stored as `REAL` seconds, which keeps sync and search maths trivial. All datetimes are stored in UTC.

---

## AI notes generator

`backend/app/notes.py` turns a transcript into notes with no API key or external service (standard library only, deterministic, unit-tested):

| Output | How |
| --- | --- |
| Keywords | The most frequent content words and recurring two-word phrases. Stop-words, numbers, filler and people's names (including people addressed by name, e.g. "Thanks, Alex") are excluded; original spelling is kept ("SOC", "Slack") |
| Overview | "*Speakers* discussed *top keywords*." plus the two highest-scoring statements. Sentences score higher when they mention key terms and decision cues (decide, launch, deadline, dates, numbers); questions score lower |
| Notes | The next five best statements, attributed to their speaker |
| Chapters | TextTiling-style segmentation: the transcript splits where the vocabulary of the three lines before and after a point differs most. Each chapter gets a title from its most distinctive phrase and a one-line summary |
| Action items | Commitments ("I'll…", "I can…"), requests ("Ben, can you…": assigned to Ben, or to whoever replies) and team actions ("let's…", "we need to…"). Due dates come from "by Friday", "tomorrow", "this week", "by October twentieth", "end of the month" |

It's extractive: it selects and organizes what was said rather than paraphrasing it. The seed meetings keep their hand-written notes. Swapping in an LLM later only means replacing `generate_notes()`, which returns plain dataclasses.

## Seed data

Five complete, realistic meetings for a fictional company, *Lumen Labs*. Each has 3–4 attendees, a 20–28-line transcript, keywords, an overview, bullet notes, 3–5 chapters, and 3–6 action items with assignees, due dates and transcript timestamps:

1. Q4 Product Roadmap Planning (Google Meet)
2. Weekly Engineering Standup (Microsoft Teams)
3. Interview: Senior Frontend Engineer (Google Meet)
4. Website Redesign Kickoff (Zoom)
5. Brightwave Discovery Call, an external sales call (Zoom)

Meeting dates are relative to "today" (today, yesterday, this week …), so the library always looks current. Transcript timings are derived from word counts. Topics and action items reference transcript lines by index (`backend/app/seed/data.py`), so they always line up with the transcript.

```bash
cd backend
python -m app.seed            # seed if the database is empty (also runs automatically on startup)
python -m app.seed --reset    # wipe all data and reseed
```

---

## Environment variables

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | backend | `sqlite:///./fireflies.db` | SQLAlchemy URL (the file sits in `backend/`) |
| `CORS_ORIGINS` | backend | `http://localhost:3000` | Comma-separated origins allowed to call the API |
| `CORS_ORIGIN_REGEX` | backend | `https?://(localhost\|127\.0\.0\.1)(:\d+)?` | Extra allowed origins as a regex. The default lets the dev frontend run on any local port; set it empty in production |
| `AUTO_SEED` | backend | `true` | Seed demo meetings on startup when the DB has no meetings |
| `GOOGLE_CLIENT_ID` | backend | *(empty)* | OAuth client ID that enables **Continue with Google**. The frontend reads it from `/api/auth/config`, so it's set in one place |
| `SESSION_DAYS` | backend | `30` | Sign-in session lifetime |
| `PORT` | backend (Docker) | `8000` | Port uvicorn listens on in the container |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` | Backend base URL, inlined into the client bundle at **build** time |

Templates: `backend/.env.example` and `frontend/.env.example`.

### Google sign-in setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add the frontend origin(s), e.g. `http://localhost:3000` (and your deployed URL). No redirect URI is needed; the button uses Google Identity Services' popup.
3. Set `GOOGLE_CLIENT_ID=<the client ID>` in `backend/.env` and restart the API.

The sign-in and sign-up pages then render Google's official button. The API verifies each ID token with Google (audience, issuer, verified email) before signing the user in. Without a client ID the button stays visible but explains that Google sign-in isn't configured.

---

## Deployment

Both apps include a Dockerfile.

```bash
# Backend: SQLite lives in /app/data, so mount a volume to keep data across restarts
docker build -t fireflies-api backend
docker run -p 8000:8000 -v fireflies-data:/app/data -e CORS_ORIGINS=https://your-frontend.example fireflies-api

# Frontend: the API URL is baked in at build time
docker build -t fireflies-web --build-arg NEXT_PUBLIC_API_URL=https://your-api.example frontend
docker run -p 3000:3000 fireflies-web
```

Typical hosting is the frontend on Vercel (root directory `frontend`, env `NEXT_PUBLIC_API_URL`) and the backend on Render, Railway or Fly.io (root directory `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, with a persistent disk for SQLite).

**Deployment checklist (Vercel + Railway)**

| Where | Setting | Value |
| --- | --- | --- |
| Vercel | `NEXT_PUBLIC_API_URL` | The Railway URL, e.g. `https://<app>.up.railway.app` (no trailing slash). Redeploy after changing it; it's baked in at build time |
| Railway | `CORS_ORIGINS` | The **exact** frontend origin, e.g. `https://<project>.vercel.app`: scheme + host, no path. Trailing slashes and quotes are tolerated. Separate several with commas |
| Railway | `CORS_ORIGIN_REGEX` *(optional)* | To also allow Vercel preview URLs: `https://<project>(-[a-z0-9-]+)?\.vercel\.app` |
| Railway | `GOOGLE_CLIENT_ID` | The OAuth Web client ID |
| Google Cloud Console | Authorized JavaScript origins | `https://<project>.vercel.app` (exact; Google allows no wildcards, so preview URLs can't use Google sign-in) |
| Vercel | Settings → Deployment Protection | Share the **production domain**. Per-deployment URLs (`<project>-<hash>-<team>.vercel.app`) are protected by Vercel Authentication and show "Request access" to anyone outside the team. Disable Vercel Authentication if those links must be public too |

On startup the API logs `CORS allowed origins: […]` and whether Google sign-in is enabled. If the browser reports a **CORS error**, check that the origin in that log line matches the page's address bar exactly.

---

## Assumptions

- **Shared workspace:** accounts are real (sign-up, sign-in, Google, sessions), but every account sees the same workspace of meetings, as one team would. Per-user meeting ownership, roles and invitations are out of scope. "My tasks" means action items assigned to the participant whose email matches the signed-in account.
- **Bearer tokens in localStorage:** simple and cross-origin-friendly for a frontend and API on different hosts. A production deployment on one domain could switch to httpOnly cookies.
- **PDF fonts:** exports use the PDF built-in Helvetica (Windows-1252), which covers English and Western European text including dashes and curly quotes. Characters outside it (e.g. Devanagari) are replaced with `?`. Embedding a Unicode TTF in `app/pdf.py` would lift this.
- **AI notes:** the seed meetings ship with hand-written notes; meetings you create get notes from the built-in extractive generator (above). All notes stay editable.
- **Media is simulated:** no recordings ship with the demo, so the player is a "Sample player" clock driven by the transcript timeline. The schema already has `meetings.media_url` for a real file.
- **Meeting creation** stands in for recording or uploading: you paste a transcript in `[mm:ss] Speaker: text` form.
- **SQLite** suits a single-instance demo. Moving to Postgres only needs a different `DATABASE_URL` and driver; the models use no SQLite-specific features.
- Timestamps display in the viewer's local timezone. Due dates are plain calendar dates, so they never shift with timezones.

## Out of scope ("Coming soon" placeholders)

These features appear in the UI as polished placeholders: a "Coming soon" page or dialog with a feature summary and a "Notify me" toast.

- Real-time meeting bots / **Capture** (joining Zoom, Meet or Teams calls), Fred notetaker settings
- Speech-to-text and **Uploads** of audio/video files (transcript files can already be imported)
- **AskFred**, **AI Skills**, **Voice Agents**, Daily digest, Meeting prep
- **Integrations** (Slack, CRMs, project tools) and calendar sync
- **Team collaboration**: invites, "Shared with me", sharing links, comments
- **Analytics** / conversation intelligence dashboards
- **Team management**: roles, invitations, SSO/SAML, password reset emails; plus billing, notifications and audio/video downloads

---

## Project structure

```
backend/
  app/
    main.py            FastAPI app, CORS, router registration, startup (init + seed)
    config.py          environment settings
    database.py        engine, session, Base, init_db
    models.py          SQLAlchemy models (schema above)
    schemas.py         Pydantic request/response models
    services.py        domain logic shared by routers
    routers/           meetings, transcript, summaries, topics, action_items, participants, profile, auth
    auth.py            password hashing, bearer sessions, Google ID-token verification
    pdf.py             PDF rendering for meeting exports
    notes.py           AI notes generator (keywords, overview, notes, chapters, action items)
    seed/              data.py (demo dataset), __init__.py (seeder), __main__.py (CLI)
  tests/test_api.py    API tests against an isolated temporary SQLite database
  requirements.txt, requirements-dev.txt, Dockerfile, .env.example

frontend/
  src/
    app/               (marketing)/ landing, privacy, terms · (auth)/ login, signup ·
                       (app)/ dashboard, meetings, meetings/[id], tasks, settings, [feature] (signed-in app shell)
    components/
      auth/            AuthProvider (session + profile), RequireAuth guard, sign-in form, Google button
      marketing/       landing sections (header, hero, product preview, features, about, CTA, footer)
      layout/          app shell, sidebar, top bar, providers
      meeting/         meeting page: header (export menu), media player/preview, transcript, notes panels,
                       meeting form + transcript input (paste / .txt / .vtt / .srt upload)
      meetings/        library + row
      action-items/    row + dialog (shared by meeting page, Tasks and Home)
      home/ tasks/ settings/ common/ ui/
    hooks/             use-resource.ts, use-playback.ts
    lib/               api client, formatting, transcript + caption parsing, attendee parsing, platforms,
                       feature registry
    types/api.ts       API types
  Dockerfile, .env.example
```

The frontend was scaffolded from [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) (MIT, see `frontend/LICENSE`). "Fireflies" and "Fred" are trademarks of Fireflies.ai; this is a non-commercial educational clone branded as Hersheys.ai. Brand assets live in `frontend/public/brand/` (logo, mark) and `frontend/src/app/` (`icon.png`, `apple-icon.png`, `favicon.ico`).
