from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import auth, models, schemas, services
from app.database import get_db

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=schemas.ProfileOut)
def get_profile(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Profile and preferences of the signed-in user."""
    return services.to_profile_out(db, user)


@router.patch("", response_model=schemas.ProfileOut)
def update_profile(
    payload: schemas.ProfileUpdate,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    changes = {field: value for field, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if "email" in changes and changes["email"] != user.email:
        if auth.find_user_by_email(db, changes["email"]):
            raise HTTPException(status.HTTP_409_CONFLICT, "Another account already uses this email.")
    for field, value in changes.items():  # every profile column is required, so explicit nulls are ignored
        setattr(user, field, value)
    db.commit()
    return services.to_profile_out(db, user)
