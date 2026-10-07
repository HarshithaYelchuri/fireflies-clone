"""Seed the database with realistic, fully processed demo meetings."""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.database import Base
from app.auth import hash_password
from app.seed.data import DEMO_ACCOUNT, MEETINGS, PEOPLE

WORDS_PER_SECOND = 2.6  # ~155 wpm, a natural speaking pace


def _timeline(lines: list[tuple[str, str]]) -> list[tuple[float, float]]:
    """Derive (start, end) seconds for each transcript line from its length."""
    spans, cursor = [], 1.0
    for index, (_, text) in enumerate(lines):
        duration = max(2.0, len(text.split()) / WORDS_PER_SECOND)
        spans.append((round(cursor, 2), round(cursor + duration, 2)))
        cursor += duration + 0.4 + (index * 7 % 10) / 10  # small, varied pauses between turns
    return spans


def _build_meeting(spec: dict, people: dict[str, models.Participant], today: date) -> models.Meeting:
    spans = _timeline(spec["transcript"])
    hour, minute = spec["time"]
    started_at = datetime.combine(today - timedelta(days=spec["days_ago"]), time(hour, minute), timezone.utc)

    meeting = models.Meeting(
        title=spec["title"],
        description=spec["description"],
        platform=spec["platform"],
        started_at=started_at,
        duration_seconds=int(spans[-1][1] + 4),
        is_starred=spec["starred"],
        attendances=[
            models.MeetingParticipant(participant=people[key], role=role) for key, role in spec["participants"]
        ],
        segments=[
            models.TranscriptSegment(speaker=people[speaker], start_time=start, end_time=end, text=text)
            for (speaker, text), (start, end) in zip(spec["transcript"], spans)
        ],
        summary=models.Summary(**spec["summary"]),
        topics=[
            models.Topic(
                title=topic["title"],
                summary=topic["summary"],
                start_time=spans[topic["from"]][0],
                end_time=spans[topic["to"]][1],
            )
            for topic in spec["topics"]
        ],
        action_items=[
            models.ActionItem(
                text=item["text"],
                assignee=people[item["assignee"]],
                due_date=today + timedelta(days=item["due_in_days"]),
                is_completed=item.get("done", False),
                timestamp=spans[item["segment"]][0],
            )
            for item in spec["action_items"]
        ],
    )
    return meeting


def seed_database(db: Session, *, reset: bool = False) -> int:
    """Insert the demo dataset. With reset=True all existing rows are removed first.

    Returns the number of meetings created (0 if data already existed and reset was False).
    """
    if reset:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    elif db.scalar(select(func.count(models.Meeting.id))):
        return 0

    people: dict[str, models.Participant] = {}
    for key, (name, email) in PEOPLE.items():
        person = db.scalar(select(models.Participant).where(models.Participant.email == email))
        people[key] = person or models.Participant(name=name, email=email)

    today = datetime.now(timezone.utc).date()
    meetings = [_build_meeting(spec, people, today) for spec in MEETINGS]
    db.add_all(meetings)
    db.commit()
    ensure_demo_account(db)
    return len(meetings)


def ensure_demo_account(db: Session) -> models.User:
    """Create the demo account if it doesn't exist yet (idempotent)."""
    email = DEMO_ACCOUNT["email"]
    user = db.scalar(select(models.User).where(func.lower(models.User.email) == email))
    if user is None:
        user = models.User(
            name=DEMO_ACCOUNT["name"],
            email=email,
            job_title=DEMO_ACCOUNT["job_title"],
            password_hash=hash_password(DEMO_ACCOUNT["password"]),
        )
        db.add(user)
        db.commit()
    return user
