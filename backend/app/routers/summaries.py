from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api/meetings/{meeting_id}/summary", tags=["summary"])


@router.get("", response_model=schemas.SummaryOut)
def get_summary(meeting_id: int, db: Session = Depends(get_db)):
    meeting = services.get_or_404(db, models.Meeting, meeting_id)
    if meeting.summary is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Meeting {meeting_id} has no summary")
    return meeting.summary


@router.put("", response_model=schemas.SummaryOut)
def upsert_summary(meeting_id: int, payload: schemas.SummaryIn, db: Session = Depends(get_db)):
    """Create the summary or replace it entirely."""
    meeting = services.get_or_404(db, models.Meeting, meeting_id)
    data = payload.model_dump()
    data["keywords"] = [k.strip() for k in data["keywords"] if k.strip()]
    data["bullet_points"] = [b.strip() for b in data["bullet_points"] if b.strip()]
    if meeting.summary is None:
        meeting.summary = models.Summary(**data)
    else:
        for field, value in data.items():
            setattr(meeting.summary, field, value)
    db.commit()
    db.refresh(meeting.summary)
    return meeting.summary


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_summary(meeting_id: int, db: Session = Depends(get_db)):
    meeting = services.get_or_404(db, models.Meeting, meeting_id)
    if meeting.summary is not None:
        db.delete(meeting.summary)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
