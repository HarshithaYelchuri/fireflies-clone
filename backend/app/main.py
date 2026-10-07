"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import get_current_user
from app.config import settings
from app.database import SessionLocal, init_db
from app.routers import action_items, auth, meetings, participants, profile, summaries, topics, transcript
from app.seed import ensure_demo_account, seed_database

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    if settings.auto_seed:
        with SessionLocal() as db:
            seed_database(db)  # no-op once meetings exist
            ensure_demo_account(db)
    yield


app = FastAPI(
    title="Hersheys.ai API",
    version="1.0.0",
    description="Meetings, transcripts, AI notes, topics and action items.",
    lifespan=lifespan,
)


@app.middleware("http")
async def unexpected_errors_as_json(request: Request, call_next):
    """Return unexpected errors as JSON 500s from *inside* the CORS middleware.

    Without this, Starlette answers from its outermost error handler, the response has no CORS
    headers, and the browser reports a network error instead of the real problem.
    """
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Something went wrong on the server."}, status_code=500)


# Registered after the error middleware so it wraps it (the last middleware added runs first).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Workspace data requires a signed-in user; auth and profile handle their own access.
for module in (meetings, transcript, summaries, topics, action_items, participants):
    app.include_router(module.router, dependencies=[Depends(get_current_user)])
app.include_router(auth.router)
app.include_router(profile.router)


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
