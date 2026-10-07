"""Domain logic shared by the routers: lookups, participant matching, meeting queries."""

from datetime import datetime
from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app import models, notes, schemas

ModelT = TypeVar("ModelT", bound=models.Base)


def get_or_404(db: Session, model: type[ModelT], obj_id: int) -> ModelT:
    obj = db.get(model, obj_id)
    if obj is None:
        label = model.__name__.replace("Item", " item").replace("Segment", " segment")
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} {obj_id} not found")
    return obj


def ensure_participant_exists(db: Session, participant_id: int | None) -> None:
    if participant_id is not None and db.get(models.Participant, participant_id) is None:
        raise HTTPException(
            422, f"Participant {participant_id} does not exist"
        )


# ── Participants ────────────────────────────────────────────────────────────


def find_or_create_participant(db: Session, name: str, email: str | None = None) -> models.Participant:
    """Match an existing person by email (preferred) or by name, otherwise create one."""
    name = name.strip()
    email = email.strip().lower() if email else None

    if email:
        found = db.scalar(select(models.Participant).where(func.lower(models.Participant.email) == email))
    else:
        found = db.scalar(
            select(models.Participant).where(func.lower(models.Participant.name) == name.lower())
        )
    if found:
        return found

    participant = models.Participant(name=name, email=email)
    db.add(participant)
    db.flush()
    return participant


def set_attendees(
    db: Session, meeting: models.Meeting, attendees: list[schemas.AttendeeIn]
) -> dict[str, models.Participant]:
    """Replace the meeting's attendee list. Returns the matched people keyed by lower-cased input name."""
    # Resolve everyone first: lookups may flush, which must not happen with half-built association rows.
    people = [(a, find_or_create_participant(db, a.name, a.email)) for a in attendees]

    current = {a.participant_id: a for a in meeting.attendances}
    roles: dict[int, str] = {}
    for attendee, person in people:
        roles[person.id] = "host" if "host" in (roles.get(person.id), attendee.role) else "attendee"

    attendances = []
    for attendee, person in people:
        if person.id not in roles:
            continue  # duplicate entry, already handled
        row = current.get(person.id) or models.MeetingParticipant(participant=person)
        row.role = roles.pop(person.id)
        attendances.append(row)
    meeting.attendances = attendances
    return {attendee.name.strip().lower(): person for attendee, person in people}


# ── Meetings ────────────────────────────────────────────────────────────────


def create_meeting(db: Session, data: schemas.MeetingCreate) -> models.Meeting:
    meeting = models.Meeting(
        title=data.title.strip(),
        description=data.description,
        platform=data.platform,
        started_at=data.started_at,
        media_url=data.media_url,
        duration_seconds=data.duration_seconds or 0,
    )
    db.add(meeting)

    # Every transcript speaker is also an attendee.
    attendees = list(data.participants)
    known = {a.name.strip().lower() for a in attendees}
    for line in data.transcript:
        if line.speaker_name.strip().lower() not in known:
            known.add(line.speaker_name.strip().lower())
            attendees.append(schemas.AttendeeIn(name=line.speaker_name))
    speakers = set_attendees(db, meeting, attendees)
    lines = sorted(data.transcript, key=lambda line: line.start_time)
    for index, line in enumerate(lines):
        next_start = lines[index + 1].start_time if index + 1 < len(lines) else None
        end_time = line.end_time or next_start or line.start_time + max(2.0, len(line.text.split()) / 2.5)
        meeting.segments.append(
            models.TranscriptSegment(
                speaker=speakers[line.speaker_name.strip().lower()],
                start_time=line.start_time,
                end_time=max(end_time, line.start_time),
                text=line.text.strip(),
            )
        )

    if data.duration_seconds is None and meeting.segments:
        meeting.duration_seconds = int(round(max(s.end_time for s in meeting.segments)))

    db.commit()
    if meeting.segments:
        generate_meeting_notes(db, meeting)  # a pasted or uploaded transcript gets AI notes straight away
    return meeting


def generate_meeting_notes(db: Session, meeting: models.Meeting) -> None:
    """(Re)generate the summary and outline from the transcript.

    Action items are only added when the meeting has none, so regenerating never duplicates or
    overwrites tasks people have already edited or completed.
    """
    attendees = {a.participant.id: a.participant.name for a in meeting.attendances}
    lines = [
        notes.Line(
            speaker=s.speaker.name if s.speaker else "Unknown speaker",
            speaker_id=s.speaker_id,
            start=s.start_time,
            end=s.end_time,
            text=s.text,
        )
        for s in meeting.segments
    ]
    generated = notes.generate_notes(lines, meeting.started_at.date(), attendees)

    if meeting.summary is None:
        meeting.summary = models.Summary()
    meeting.summary.overview = generated.overview
    meeting.summary.bullet_points = generated.bullet_points
    meeting.summary.keywords = generated.keywords
    meeting.topics = [
        models.Topic(title=t.title, summary=t.summary, start_time=t.start_time, end_time=t.end_time)
        for t in generated.topics
    ]
    if not meeting.action_items:
        meeting.action_items = [
            models.ActionItem(text=a.text, assignee_id=a.assignee_id, timestamp=a.timestamp, due_date=a.due_date)
            for a in generated.action_items
        ]
    db.commit()


def update_meeting(db: Session, meeting: models.Meeting, data: schemas.MeetingUpdate) -> models.Meeting:
    changes = data.model_dump(exclude_unset=True, exclude={"participants"})
    for field, value in changes.items():
        if value is None and field in {"title", "platform", "started_at", "duration_seconds", "is_starred"}:
            continue  # these columns are required; ignore explicit nulls
        setattr(meeting, field, value)
    if data.participants is not None:
        set_attendees(db, meeting, data.participants)
    db.commit()
    return meeting


def list_meetings(
    db: Session,
    *,
    q: str | None,
    search_in: schemas.SearchScope = "all",
    participant_id: int | None,
    platform: str | None,
    starred: bool | None,
    date_from: datetime | None,
    date_to: datetime | None,
    sort: schemas.MeetingSort,
    order: schemas.SortOrder,
    limit: int,
    offset: int,
) -> tuple[list[models.Meeting], int]:
    stmt = select(models.Meeting)

    if q and search_in == "title":
        stmt = stmt.where(models.Meeting.title.ilike(f"%{q.strip()}%"))
    elif q:
        pattern = f"%{q.strip()}%"
        in_transcript = (
            select(models.TranscriptSegment.id)
            .where(models.TranscriptSegment.meeting_id == models.Meeting.id)
            .where(models.TranscriptSegment.text.ilike(pattern))
            .exists()
        )
        in_summary = (
            select(models.Summary.id)
            .where(models.Summary.meeting_id == models.Meeting.id)
            .where(
                or_(
                    models.Summary.overview.ilike(pattern),
                    cast(models.Summary.keywords, String).ilike(pattern),
                )
            )
            .exists()
        )
        stmt = stmt.where(
            or_(
                models.Meeting.title.ilike(pattern),
                models.Meeting.description.ilike(pattern),
                in_transcript,
                in_summary,
            )
        )
    if participant_id is not None:
        stmt = stmt.where(
            select(models.MeetingParticipant.meeting_id)
            .where(models.MeetingParticipant.meeting_id == models.Meeting.id)
            .where(models.MeetingParticipant.participant_id == participant_id)
            .exists()
        )
    if platform:
        stmt = stmt.where(models.Meeting.platform == platform)
    if starred is not None:
        stmt = stmt.where(models.Meeting.is_starred == starred)
    if date_from:
        stmt = stmt.where(models.Meeting.started_at >= date_from)
    if date_to:
        stmt = stmt.where(models.Meeting.started_at <= date_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_column = {
        "date": models.Meeting.started_at,
        "title": func.lower(models.Meeting.title),
        "duration": models.Meeting.duration_seconds,
    }[sort]
    stmt = stmt.order_by(sort_column.desc() if order == "desc" else sort_column.asc(), models.Meeting.id)
    stmt = stmt.options(
        selectinload(models.Meeting.attendances),
        selectinload(models.Meeting.summary),
        selectinload(models.Meeting.action_items),
    )
    return list(db.scalars(stmt.limit(limit).offset(offset))), total


SNIPPET_RADIUS = 70  # characters of context on each side of a search hit


def _snippet(text: str, needle: str) -> str | None:
    """A short excerpt of `text` around the first case-insensitive occurrence of `needle`."""
    index = text.lower().find(needle.lower())
    if index < 0:
        return None
    start = max(0, index - SNIPPET_RADIUS)
    end = min(len(text), index + len(needle) + SNIPPET_RADIUS)
    # Don't cut words in half at either edge.
    if start > 0 and (cut := text.find(" ", start, index)) != -1:
        start = cut + 1
    if end < len(text) and (cut := text.rfind(" ", index + len(needle), end)) != -1:
        end = cut
    return ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")


def find_search_matches(db: Session, meetings: list[models.Meeting], q: str) -> dict[int, schemas.SearchMatch]:
    """Explain why each meeting matched `q`: title, description, transcript (with timestamp), overview, keyword."""
    q = q.strip()
    matches: dict[int, schemas.SearchMatch] = {}
    for meeting in meetings:
        if q.lower() in meeting.title.lower():
            matches[meeting.id] = schemas.SearchMatch(field="title", snippet=meeting.title)
        elif meeting.description and (snippet := _snippet(meeting.description, q)):
            matches[meeting.id] = schemas.SearchMatch(field="description", snippet=snippet)

    remaining = [m.id for m in meetings if m.id not in matches]
    if remaining:
        segments = db.scalars(
            select(models.TranscriptSegment)
            .where(models.TranscriptSegment.meeting_id.in_(remaining))
            .where(models.TranscriptSegment.text.ilike(f"%{q}%"))
            .order_by(models.TranscriptSegment.meeting_id, models.TranscriptSegment.start_time)
        )
        for segment in segments:
            snippet = _snippet(segment.text, q)
            if segment.meeting_id not in matches and snippet:
                matches[segment.meeting_id] = schemas.SearchMatch(
                    field="transcript", snippet=snippet, start_time=segment.start_time
                )

    for meeting in meetings:
        if meeting.id in matches or not meeting.summary:
            continue
        if snippet := _snippet(meeting.summary.overview, q):
            matches[meeting.id] = schemas.SearchMatch(field="overview", snippet=snippet)
        elif keyword := next((k for k in meeting.summary.keywords if q.lower() in k.lower()), None):
            matches[meeting.id] = schemas.SearchMatch(field="keywords", snippet=keyword)
    return matches


def load_meeting_detail(db: Session, meeting_id: int) -> models.Meeting:
    meeting = db.scalar(
        select(models.Meeting)
        .where(models.Meeting.id == meeting_id)
        .options(
            selectinload(models.Meeting.attendances),
            selectinload(models.Meeting.segments),
            selectinload(models.Meeting.summary),
            selectinload(models.Meeting.topics),
            selectinload(models.Meeting.action_items),
        )
    )
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Meeting {meeting_id} not found")
    return meeting


# ── Serialization ───────────────────────────────────────────────────────────


def _attendees(meeting: models.Meeting) -> list[schemas.AttendeeOut]:
    hosts_first = sorted(meeting.attendances, key=lambda a: (a.role != "host", a.participant.name))
    return [
        schemas.AttendeeOut(id=a.participant.id, name=a.participant.name, email=a.participant.email, role=a.role)
        for a in hosts_first
    ]


def to_list_item(meeting: models.Meeting, match: schemas.SearchMatch | None = None) -> schemas.MeetingListItem:
    return schemas.MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        description=meeting.description,
        platform=meeting.platform,
        started_at=meeting.started_at,
        duration_seconds=meeting.duration_seconds,
        is_starred=meeting.is_starred,
        participants=_attendees(meeting),
        keywords=meeting.summary.keywords if meeting.summary else [],
        overview=meeting.summary.overview if meeting.summary else None,
        action_items_count=len(meeting.action_items),
        open_action_items_count=sum(not item.is_completed for item in meeting.action_items),
        match=match,
    )


def to_detail(meeting: models.Meeting) -> schemas.MeetingDetail:
    return schemas.MeetingDetail(
        **to_list_item(meeting).model_dump(),
        media_url=meeting.media_url,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        segments=[schemas.SegmentOut.model_validate(s) for s in meeting.segments],
        summary=schemas.SummaryOut.model_validate(meeting.summary) if meeting.summary else None,
        topics=[schemas.TopicOut.model_validate(t) for t in meeting.topics],
        action_items=[schemas.ActionItemOut.model_validate(a) for a in meeting.action_items],
    )


# ── Accounts ────────────────────────────────────────────────────────────────


def to_profile_out(db: Session, user: models.User) -> schemas.ProfileOut:
    participant_id = db.scalar(
        select(models.Participant.id).where(func.lower(models.Participant.email) == user.email.lower())
    )
    return schemas.ProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        job_title=user.job_title,
        language=user.language,
        email_recap=user.email_recap,
        task_notifications=user.task_notifications,
        weekly_digest=user.weekly_digest,
        workspace=user.workspace,
        plan=user.plan,
        participant_id=participant_id,
        has_password=user.password_hash is not None,
        google_linked=user.google_sub is not None,
        updated_at=user.updated_at,
    )
