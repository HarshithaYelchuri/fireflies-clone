from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api", tags=["transcript"])


@router.get("/meetings/{meeting_id}/segments", response_model=list[schemas.SegmentOut])
def list_segments(meeting_id: int, q: str | None = None, db: Session = Depends(get_db)):
    services.get_or_404(db, models.Meeting, meeting_id)
    stmt = (
        select(models.TranscriptSegment)
        .where(models.TranscriptSegment.meeting_id == meeting_id)
        .order_by(models.TranscriptSegment.start_time)
    )
    if q:
        stmt = stmt.where(models.TranscriptSegment.text.ilike(f"%{q}%"))
    return db.scalars(stmt).all()


@router.post(
    "/meetings/{meeting_id}/segments",
    response_model=schemas.SegmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_segment(meeting_id: int, payload: schemas.SegmentCreate, db: Session = Depends(get_db)):
    services.get_or_404(db, models.Meeting, meeting_id)
    services.ensure_participant_exists(db, payload.speaker_id)
    segment = models.TranscriptSegment(meeting_id=meeting_id, **payload.model_dump())
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


@router.patch("/segments/{segment_id}", response_model=schemas.SegmentOut)
def update_segment(segment_id: int, payload: schemas.SegmentUpdate, db: Session = Depends(get_db)):
    segment = services.get_or_404(db, models.TranscriptSegment, segment_id)
    changes = payload.model_dump(exclude_unset=True)
    if "speaker_id" in changes:
        services.ensure_participant_exists(db, changes["speaker_id"])
    for field, value in changes.items():
        if value is None and field != "speaker_id":
            continue
        setattr(segment, field, value)
    if segment.end_time < segment.start_time:
        raise HTTPException(422, "end_time must be greater than or equal to start_time")
    db.commit()
    db.refresh(segment)
    return segment


@router.delete("/segments/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_segment(segment_id: int, db: Session = Depends(get_db)):
    db.delete(services.get_or_404(db, models.TranscriptSegment, segment_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
