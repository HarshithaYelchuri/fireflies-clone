"""Relational schema.

    participants ──< meeting_participants >── meetings
         │                                      │
         ├──< transcript_segments (speaker) >───┤
         └──< action_items (assignee) >─────────┤
                                                ├── summaries (1:1)
                                                └──< topics

    users ──< auth_sessions      accounts (profile + preferences) and their sign-in sessions
"""

from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Participant(TimestampMixin, Base):
    """A person who can attend meetings, speak in transcripts and own action items."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)

    attendances: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="participant", cascade="all, delete-orphan"
    )


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(String(32), default="zoom")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    media_url: Mapped[str | None] = mapped_column(String(500))
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False)

    attendances: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.start_time",
    )
    summary: Mapped["Summary | None"] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    topics: Mapped[list["Topic"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Topic.start_time"
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id"
    )


class MeetingParticipant(Base):
    """Association between meetings and participants, carrying the attendee's role."""

    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[str] = mapped_column(String(16), default="attendee")  # "host" | "attendee"

    meeting: Mapped[Meeting] = relationship(back_populates="attendances")
    participant: Mapped[Participant] = relationship(back_populates="attendances", lazy="joined")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (Index("ix_segments_meeting_start", "meeting_id", "start_time"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    speaker_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    start_time: Mapped[float] = mapped_column(Float)  # seconds from meeting start
    end_time: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    speaker: Mapped[Participant | None] = relationship(lazy="joined")


class Summary(Base):
    """AI-generated meeting notes. Lists are stored as JSON arrays (ordered, never queried alone)."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text, default="")
    bullet_points: Mapped[list[str]] = mapped_column(JSON, default=list)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    meeting: Mapped[Meeting] = relationship(back_populates="summary")


class Topic(Base):
    """A chapter of the meeting (the time-stamped outline)."""

    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    start_time: Mapped[float] = mapped_column(Float)
    end_time: Mapped[float] = mapped_column(Float)

    meeting: Mapped[Meeting] = relationship(back_populates="topics")


class ActionItem(TimestampMixin, Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    timestamp: Mapped[float | None] = mapped_column(Float)  # moment in the meeting it came from

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
    assignee: Mapped[Participant | None] = relationship(lazy="joined")

    @property
    def meeting_title(self) -> str:
        return self.meeting.title


class User(TimestampMixin, Base):
    """An account that can sign in, with its profile and preferences.

    All users share one workspace (the meetings are not owned per user). Linked to the matching
    participant by email, which is how "my tasks" are found.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)  # stored lower-case
    password_hash: Mapped[str | None] = mapped_column(String(255))  # None for Google-only accounts
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)  # Google account id
    job_title: Mapped[str] = mapped_column(String(120), default="")
    workspace: Mapped[str] = mapped_column(String(120), default="Lumen Labs")
    plan: Mapped[str] = mapped_column(String(32), default="Free")
    language: Mapped[str] = mapped_column(String(8), default="en")
    email_recap: Mapped[bool] = mapped_column(Boolean, default=True)
    task_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_digest: Mapped[bool] = mapped_column(Boolean, default=False)

    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    """A signed-in session. Only a SHA-256 hash of the bearer token is stored."""

    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions", lazy="joined")
