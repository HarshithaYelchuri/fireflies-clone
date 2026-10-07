from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app import models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api", tags=["action items"])


@router.get("/action-items", response_model=list[schemas.ActionItemOut])
def list_action_items(
    meeting_id: int | None = None,
    assignee_id: int | None = None,
    completed: bool | None = None,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Action items across all meetings (powers the Tasks page)."""
    stmt = select(models.ActionItem).options(joinedload(models.ActionItem.meeting))
    if meeting_id is not None:
        stmt = stmt.where(models.ActionItem.meeting_id == meeting_id)
    if assignee_id is not None:
        stmt = stmt.where(models.ActionItem.assignee_id == assignee_id)
    if completed is not None:
        stmt = stmt.where(models.ActionItem.is_completed == completed)
    stmt = stmt.order_by(
        models.ActionItem.is_completed,
        models.ActionItem.due_date.is_(None),
        models.ActionItem.due_date,
        models.ActionItem.id.desc(),
    )
    return db.scalars(stmt.limit(limit)).unique().all()


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=schemas.ActionItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(meeting_id: int, payload: schemas.ActionItemCreate, db: Session = Depends(get_db)):
    services.get_or_404(db, models.Meeting, meeting_id)
    services.ensure_participant_exists(db, payload.assignee_id)
    item = models.ActionItem(meeting_id=meeting_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/action-items/{item_id}", response_model=schemas.ActionItemOut)
def get_action_item(item_id: int, db: Session = Depends(get_db)):
    return services.get_or_404(db, models.ActionItem, item_id)


@router.patch("/action-items/{item_id}", response_model=schemas.ActionItemOut)
def update_action_item(item_id: int, payload: schemas.ActionItemUpdate, db: Session = Depends(get_db)):
    item = services.get_or_404(db, models.ActionItem, item_id)
    changes = payload.model_dump(exclude_unset=True)
    if "assignee_id" in changes:
        services.ensure_participant_exists(db, changes["assignee_id"])
    for field, value in changes.items():
        if value is None and field in {"text", "is_completed"}:
            continue  # required columns; nullable ones (assignee, due date, timestamp) can be cleared
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    db.delete(services.get_or_404(db, models.ActionItem, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
