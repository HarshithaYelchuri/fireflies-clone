from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api", tags=["topics"])


@router.get("/meetings/{meeting_id}/topics", response_model=list[schemas.TopicOut])
def list_topics(meeting_id: int, db: Session = Depends(get_db)):
    return services.get_or_404(db, models.Meeting, meeting_id).topics


@router.post(
    "/meetings/{meeting_id}/topics",
    response_model=schemas.TopicOut,
    status_code=status.HTTP_201_CREATED,
)
def create_topic(meeting_id: int, payload: schemas.TopicCreate, db: Session = Depends(get_db)):
    services.get_or_404(db, models.Meeting, meeting_id)
    topic = models.Topic(meeting_id=meeting_id, **payload.model_dump())
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.patch("/topics/{topic_id}", response_model=schemas.TopicOut)
def update_topic(topic_id: int, payload: schemas.TopicUpdate, db: Session = Depends(get_db)):
    topic = services.get_or_404(db, models.Topic, topic_id)
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(topic, field, value)
    if topic.end_time < topic.start_time:
        raise HTTPException(422, "end_time must be greater than or equal to start_time")
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    db.delete(services.get_or_404(db, models.Topic, topic_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
