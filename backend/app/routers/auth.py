from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import auth, models, schemas, services
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _signed_in(db: Session, user: models.User) -> schemas.AuthOut:
    return schemas.AuthOut(token=auth.create_session(db, user), user=services.to_profile_out(db, user))


@router.get("/config", response_model=schemas.AuthConfigOut)
def auth_config():
    """Public settings the sign-in page needs (Google sign-in is shown only when configured)."""
    return {"google_client_id": settings.google_client_id}


@router.post("/signup", response_model=schemas.AuthOut, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupIn, db: Session = Depends(get_db)):
    existing = auth.find_user_by_email(db, payload.email)
    if existing:
        hint = " Try continuing with Google." if existing.password_hash is None else " Sign in instead."
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists." + hint)
    user = models.User(name=payload.name, email=payload.email, password_hash=auth.hash_password(payload.password))
    db.add(user)
    db.commit()
    return _signed_in(db, user)


@router.post("/login", response_model=schemas.AuthOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = auth.find_user_by_email(db, payload.email)
    if user and user.password_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This account uses Google sign-in. Continue with Google.")
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return _signed_in(db, user)


@router.post("/google", response_model=schemas.AuthOut)
def google_login(payload: schemas.GoogleLoginIn, db: Session = Depends(get_db)):
    """Sign in (or sign up) with a Google Identity Services credential."""
    claims = auth.verify_google_credential(payload.credential)
    user = db.scalar(select(models.User).where(models.User.google_sub == claims["sub"]))
    if user is None:
        # First Google sign-in: link to an existing account with the same verified email, or create one.
        user = auth.find_user_by_email(db, claims["email"])
        if user is None:
            user = models.User(name=claims.get("name") or claims["email"].split("@")[0], email=claims["email"].lower())
            db.add(user)
        user.google_sub = claims["sub"]
        db.commit()
    return _signed_in(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = auth.bearer_token(authorization)
    if token:
        auth.end_session(db, token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=schemas.ProfileOut)
def me(user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return services.to_profile_out(db, user)
