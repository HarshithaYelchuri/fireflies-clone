"""Accounts and sessions: password hashing, bearer-token sessions and Google ID-token verification.

Standard library only. Passwords use PBKDF2-HMAC-SHA256; session tokens are random and only their
SHA-256 hash is stored, so a leaked database doesn't leak usable tokens.
"""

import base64
import hashlib
import hmac
import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db

PBKDF2_ITERATIONS = 240_000
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


# ── Passwords ───────────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        _, iterations, salt, digest = stored.split("$")
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iterations))
        return hmac.compare_digest(candidate, base64.b64decode(digest))
    except ValueError:
        return False


# ── Sessions ────────────────────────────────────────────────────────────────


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: models.User) -> str:
    """Start a session and return its bearer token (shown to the client once, never stored)."""
    token = secrets.token_urlsafe(32)
    db.add(
        models.AuthSession(
            user=user,
            token_hash=_token_hash(token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.session_days),
        )
    )
    db.commit()
    return token


def end_session(db: Session, token: str) -> None:
    session = db.scalar(select(models.AuthSession).where(models.AuthSession.token_hash == _token_hash(token)))
    if session:
        db.delete(session)
        db.commit()


def bearer_token(authorization: str | None) -> str | None:
    scheme, _, token = (authorization or "").partition(" ")
    return token.strip() if scheme.lower() == "bearer" and token.strip() else None


def get_current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.User:
    """FastAPI dependency: the signed-in user, or 401."""
    token = bearer_token(authorization)
    session = token and db.scalar(
        select(models.AuthSession).where(models.AuthSession.token_hash == _token_hash(token))
    )
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in.", headers={"WWW-Authenticate": "Bearer"})
    expires_at = session.expires_at.replace(tzinfo=session.expires_at.tzinfo or timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")
    return session.user


def find_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalar(select(models.User).where(func.lower(models.User.email) == email.lower()))


# ── Google ──────────────────────────────────────────────────────────────────


def verify_google_credential(credential: str) -> dict:
    """Validate a Google Identity Services ID token with Google and return its claims.

    Uses Google's tokeninfo endpoint (which checks the signature and expiry) and then checks that
    the token was issued for this app's client ID and that the email is verified.
    """
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in isn't configured on this server.")
    url = f"{GOOGLE_TOKENINFO_URL}?{urllib.parse.urlencode({'id_token': credential})}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            claims = json.load(response)
    except urllib.error.HTTPError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed. Please try again.") from None
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Couldn't reach Google to verify the sign-in.") from None

    if claims.get("aud") != settings.google_client_id or claims.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This Google sign-in wasn't issued for Hersheys.ai.")
    if str(claims.get("email_verified")).lower() != "true" or not claims.get("email"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your Google account email isn't verified.")
    return claims
