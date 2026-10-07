from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api/participants", tags=["participants"])


def _normalize_email(email: str | None) -> str | None:
    return email.strip().lower() or None if email else None


def _ensure_email_free(db: Session, email: str | None, exclude_id: int | None = None) -> None:
    if not email:
        return
    clash = db.scalar(select(models.Participant).where(func.lower(models.Participant.email) == email))
    if clash and clash.id != exclude_id:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A participant with email {email} already exists")


@router.get("", response_model=list[schemas.ParticipantOut])
def list_participants(q: str | None = None, db: Session = Depends(get_db)):
    stmt = select(models.Participant).order_by(models.Participant.name)
    if q:
        stmt = stmt.where(
            or_(models.Participant.name.ilike(f"%{q}%"), models.Participant.email.ilike(f"%{q}%"))
        )
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.ParticipantOut, status_code=status.HTTP_201_CREATED)
def create_participant(payload: schemas.ParticipantCreate, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    _ensure_email_free(db, email)
    participant = models.Participant(name=payload.name.strip(), email=email)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.get("/{participant_id}", response_model=schemas.ParticipantOut)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    return services.get_or_404(db, models.Participant, participant_id)


@router.patch("/{participant_id}", response_model=schemas.ParticipantOut)
def update_participant(
    participant_id: int, payload: schemas.ParticipantUpdate, db: Session = Depends(get_db)
):
    participant = services.get_or_404(db, models.Participant, participant_id)
    changes = payload.model_dump(exclude_unset=True)
    if "email" in changes:
        changes["email"] = _normalize_email(changes["email"])
        _ensure_email_free(db, changes["email"], exclude_id=participant_id)
    if changes.get("name"):
        participant.name = changes["name"].strip()
    if "email" in changes:
        participant.email = changes["email"]
    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    """Removes the person from meetings; their transcript lines and tasks become unassigned."""
    db.delete(services.get_or_404(db, models.Participant, participant_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
