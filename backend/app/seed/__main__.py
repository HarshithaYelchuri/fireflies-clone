"""CLI: `python -m app.seed [--reset]`."""

import argparse

from app.database import SessionLocal, init_db
from app.seed import ensure_demo_account, seed_database


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Hersheys.ai database with demo meetings.")
    parser.add_argument("--reset", action="store_true", help="delete all existing data before seeding")
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        created = seed_database(db, reset=args.reset)
        ensure_demo_account(db)
    if created:
        print(f"Seeded {created} meetings.")
    else:
        print("Database already contains meetings; nothing to do (use --reset to start over).")


if __name__ == "__main__":
    main()
