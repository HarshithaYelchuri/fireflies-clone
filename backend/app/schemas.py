"""Pydantic request/response schemas."""

import re
from datetime import date, datetime, timezone
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    model_validator,
)

Platform = Literal["zoom", "google_meet", "microsoft_teams", "webex", "upload"]
Role = Literal["host", "attendee"]


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes; everything is stored in UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


UTCDateTime = Annotated[
    datetime,
    AfterValidator(_as_utc),
    # JSON only: model_dump() must keep real datetimes, because services write dumped values to the DB.
    PlainSerializer(lambda v: _as_utc(v).isoformat().replace("+00:00", "Z"), return_type=str, when_used="json"),
]
Seconds = Annotated[float, Field(ge=0)]

_EMAIL_RE = re.compile(r"^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$")


def _clean_email(value: str | None) -> str | None:
    value = (value or "").strip().lower()
    if not value:
        return None
    if not _EMAIL_RE.fullmatch(value):
        raise ValueError(f"'{value}' is not a valid email address")
    return value


def _clean_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Name can't be empty")
    if "<" in value or ">" in value:
        raise ValueError(f"'{value}' looks like a name with an email; use the format: Name <email>")
    return value


# Validated input types (outputs use plain strings so stored data always serializes).
EmailIn = Annotated[str | None, Field(default=None, max_length=255), AfterValidator(_clean_email)]
NameIn = Annotated[str, Field(min_length=1, max_length=120), AfterValidator(_clean_name)]

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int


# ── Participants ────────────────────────────────────────────────────────────


class ParticipantBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)


class ParticipantCreate(BaseModel):
    name: NameIn
    email: EmailIn = None


class ParticipantUpdate(BaseModel):
    name: NameIn | None = None
    email: EmailIn = None


class ParticipantOut(ParticipantBase, ORMModel):
    id: int


class AttendeeOut(ParticipantOut):
    role: Role


class AttendeeIn(BaseModel):
    """Attendee reference used when creating/updating a meeting; matched by email, then name."""

    name: NameIn
    email: EmailIn = None
    role: Role = "attendee"


# ── Transcript ──────────────────────────────────────────────────────────────


class _TimedRange(BaseModel):
    start_time: Seconds
    end_time: Seconds

    @model_validator(mode="after")
    def _check_range(self):
        if self.end_time < self.start_time:
            raise ValueError("end_time must be greater than or equal to start_time")
        return self


class SegmentCreate(_TimedRange):
    speaker_id: int | None = None
    text: str = Field(min_length=1)


class SegmentUpdate(BaseModel):
    speaker_id: int | None = None
    start_time: Seconds | None = None
    end_time: Seconds | None = None
    text: str | None = Field(default=None, min_length=1)


class SegmentOut(ORMModel):
    id: int
    meeting_id: int
    speaker_id: int | None
    speaker: ParticipantOut | None
    start_time: float
    end_time: float
    text: str


class NewMeetingSegment(BaseModel):
    """Transcript line supplied inline when creating a meeting; speaker matched by name."""

    speaker_name: NameIn
    start_time: Seconds
    end_time: Seconds | None = None
    text: str = Field(min_length=1)


# ── Summary ─────────────────────────────────────────────────────────────────


class SummaryIn(BaseModel):
    overview: str = ""
    bullet_points: list[str] = []
    keywords: list[str] = []


class SummaryOut(SummaryIn, ORMModel):
    id: int
    meeting_id: int
    updated_at: UTCDateTime


# ── Topics / chapters ───────────────────────────────────────────────────────


class TopicCreate(_TimedRange):
    title: str = Field(min_length=1, max_length=255)
    summary: str = ""


class TopicUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = None
    start_time: Seconds | None = None
    end_time: Seconds | None = None


class TopicOut(ORMModel):
    id: int
    meeting_id: int
    title: str
    summary: str
    start_time: float
    end_time: float


# ── Action items ────────────────────────────────────────────────────────────


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1)
    assignee_id: int | None = None
    due_date: date | None = None
    is_completed: bool = False
    timestamp: Seconds | None = None


class ActionItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    assignee_id: int | None = None
    due_date: date | None = None
    is_completed: bool | None = None
    timestamp: Seconds | None = None


class ActionItemOut(ORMModel):
    id: int
    meeting_id: int
    meeting_title: str
    text: str
    assignee_id: int | None
    assignee: ParticipantOut | None
    due_date: date | None
    is_completed: bool
    timestamp: float | None
    created_at: UTCDateTime
    updated_at: UTCDateTime


# ── Meetings ────────────────────────────────────────────────────────────────


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    platform: Platform = "zoom"
    started_at: UTCDateTime
    duration_seconds: int | None = Field(default=None, ge=0)
    media_url: str | None = Field(default=None, max_length=500)
    participants: list[AttendeeIn] = []
    transcript: list[NewMeetingSegment] = []


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    platform: Platform | None = None
    started_at: UTCDateTime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    media_url: str | None = Field(default=None, max_length=500)
    is_starred: bool | None = None
    participants: list[AttendeeIn] | None = None  # replaces the attendee list when provided


class SearchMatch(BaseModel):
    """Why a meeting matched the library search, so the UI can show the matching text."""

    field: Literal["title", "description", "transcript", "overview", "keywords"]
    snippet: str
    start_time: float | None = None  # transcript matches only


class MeetingListItem(BaseModel):
    id: int
    title: str
    description: str | None
    platform: Platform
    started_at: UTCDateTime
    duration_seconds: int
    is_starred: bool
    participants: list[AttendeeOut]
    keywords: list[str]
    overview: str | None
    action_items_count: int
    open_action_items_count: int
    match: SearchMatch | None = None


class MeetingDetail(MeetingListItem):
    media_url: str | None
    created_at: UTCDateTime
    updated_at: UTCDateTime
    segments: list[SegmentOut]
    summary: SummaryOut | None
    topics: list[TopicOut]
    action_items: list[ActionItemOut]


MeetingSort = Literal["date", "title", "duration"]
SortOrder = Literal["asc", "desc"]
SearchScope = Literal["all", "title"]
ExportContent = Literal["summary", "transcript"]


# ── Accounts & profile ─────────────────────────────────────────────────────


class ProfileUpdate(BaseModel):
    name: NameIn | None = None
    email: Annotated[str | None, Field(default=None, max_length=255), AfterValidator(_clean_email)] = None
    job_title: str | None = Field(default=None, max_length=120)
    language: Literal["en", "es", "fr", "de", "hi"] | None = None
    email_recap: bool | None = None
    task_notifications: bool | None = None
    weekly_digest: bool | None = None


class ProfileOut(ORMModel):
    id: int
    name: str
    email: str
    job_title: str
    language: str
    email_recap: bool
    task_notifications: bool
    weekly_digest: bool
    workspace: str
    plan: str
    participant_id: int | None  # the participant record that represents this user, matched by email
    has_password: bool
    google_linked: bool
    updated_at: UTCDateTime


Email = Annotated[str, Field(max_length=255), AfterValidator(_clean_email)]


class SignupIn(BaseModel):
    name: NameIn
    email: Email
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class GoogleLoginIn(BaseModel):
    credential: str = Field(min_length=20, description="ID token from Google Identity Services")


class AuthOut(BaseModel):
    token: str
    user: ProfileOut


class AuthConfigOut(BaseModel):
    google_client_id: str | None
