"""Runtime configuration, read from environment variables."""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "sqlite:///./fireflies.db"
        )
    )

    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("CORS_ORIGINS", "http://localhost:3000")
        )
    )

    cors_origin_regex: str | None = field(
        default_factory=lambda: os.getenv(
            "CORS_ORIGIN_REGEX",
            r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
        ) or None
    )

    google_client_id: str | None = field(
        default_factory=lambda: os.getenv("GOOGLE_CLIENT_ID") or None
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