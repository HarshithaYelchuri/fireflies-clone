import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.database import get_db
from app.pdf import render_meeting_pdf

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_model=schemas.Page[schemas.MeetingListItem])
def list_meetings(
    q: str | None = Query(None, description="Matches title, description, transcript text, overview and keywords"),
    search_in: schemas.SearchScope = Query("all", description="`title` restricts `q` to meeting titles"),
    participant_id: int | None = None,
    platform: schemas.Platform | None = None,
    starred: bool | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    sort: schemas.MeetingSort = "date",
    order: schemas.SortOrder = "desc",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    meetings, total = services.list_meetings(
        db,
        q=q,
        search_in=search_in,
        participant_id=participant_id,
        platform=platform,
        starred=starred,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )
    matches = services.find_search_matches(db, meetings, q) if q and q.strip() else {}
    return {"items": [services.to_list_item(m, matches.get(m.id)) for m in meetings], "total": total}


@router.post("", response_model=schemas.MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(payload: schemas.MeetingCreate, db: Session = Depends(get_db)):
    meeting = services.create_meeting(db, payload)
    return services.to_detail(services.load_meeting_detail(db, meeting.id))


@router.get("/{meeting_id}", response_model=schemas.MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    return services.to_detail(services.load_meeting_detail(db, meeting_id))


@router.patch("/{meeting_id}", response_model=schemas.MeetingDetail)
def update_meeting(meeting_id: int, payload: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    meeting = services.load_meeting_detail(db, meeting_id)
    services.update_meeting(db, meeting, payload)
    return services.to_detail(services.load_meeting_detail(db, meeting_id))


@router.post("/{meeting_id}/generate-notes", response_model=schemas.MeetingDetail)
def generate_notes(meeting_id: int, db: Session = Depends(get_db)):
    """Generate the AI summary, keywords and outline from the transcript (replacing the current ones).

    Action items are added only if the meeting has none yet.
    """
    meeting = services.load_meeting_detail(db, meeting_id)
    if not meeting.segments:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "This meeting has no transcript to generate notes from.")
    services.generate_meeting_notes(db, meeting)
    return services.to_detail(services.load_meeting_detail(db, meeting_id))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    db.delete(services.get_or_404(db, models.Meeting, meeting_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{meeting_id}/export.pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}, "description": "The PDF file"}},
)
def export_meeting_pdf(
    meeting_id: int,
    content: schemas.ExportContent = Query("summary", description="`summary` (AI notes, outline, action items) or `transcript`"),
    db: Session = Depends(get_db),
):
    meeting = services.load_meeting_detail(db, meeting_id)
    slug = re.sub(r"[^a-z0-9]+", "-", meeting.title.lower()).strip("-") or "meeting"
    return Response(
        render_meeting_pdf(meeting, content),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{slug}-{content}.pdf"'},
    )
