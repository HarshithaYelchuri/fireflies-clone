"""Runtime configuration, read from environment variables."""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


def _clean(value: str) -> str:
    """Forgive values pasted into hosting dashboards with quotes or stray spaces."""
    return value.strip().strip("'\"").strip()


def _origins(value: str) -> list[str]:
    """Comma-separated origins. An origin has no path, so a trailing "/" (a common mistake) is dropped."""
    return [_clean(item).rstrip("/") for item in value.split(",") if _clean(item)]


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "sqlite:///./fireflies.db"
        )
    )

    cors_origins: list[str] = field(
        default_factory=lambda: _origins(
            os.getenv("CORS_ORIGINS", "http://localhost:3000")
        )
    )

    cors_origin_regex: str | None = field(
        default_factory=lambda: _clean(os.getenv(
            "CORS_ORIGIN_REGEX",
            r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
        )) or None
    )

    google_client_id: str | None = field(
        default_factory=lambda: _clean(os.getenv("GOOGLE_CLIENT_ID", "")) or None
    )

    session_days: int = field(
        default_factory=lambda: int(os.getenv("SESSION_DAYS", "30"))
    )

    auto_seed: bool = field(
        default_factory=lambda: os.getenv(
            "AUTO_SEED", "true"
        ).lower() in {"1", "true", "yes"}
    )


settings = Settings()