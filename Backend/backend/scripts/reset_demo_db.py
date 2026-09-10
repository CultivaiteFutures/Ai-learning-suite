"""
reset_demo_db.py -- One-time DESTRUCTIVE reset of the AI Learning Suite
database to a clean slate, then re-bootstraps the platform Super Admin.

WHY THIS EXISTS
----------------
There is intentionally no "wipe everything" HTTP API in this app (and there
shouldn't be one -- resetting infrastructure state is different from
fabricating business data). Before recording/running a demo with
seed_demo_data.py, run this script once so the database contains ONLY the
one clean demo school afterwards, with nothing left over from earlier
testing/dev use.

WHAT IT DOES
------------
1. Reads DATABASE_URL exactly the way the app itself does (via
   app.core.config.settings) -- never hardcodes a connection string, so it
   always matches whatever this machine's real .env says.
2. Drops every table known to SQLAlchemy's metadata, then recreates them
   (Base.metadata.drop_all + create_all) -- mirrors app/main.py's own
   table-creation step, just torn down first.
3. Recreates the bootstrap Super Admin using the *exact* same logic as
   app/main.py's init_superadmin() (email/password from settings, hashed via
   the app's own get_password_hash), so the script is fully self-contained --
   you do not have to separately restart the server afterwards just to get
   the Super Admin back.

HOW TO RUN
----------
    cd Backend/backend
    python scripts/reset_demo_db.py --yes-i-am-sure

This is DESTRUCTIVE. It will refuse to run without the --yes-i-am-sure flag,
and it always prints exactly which database (host/port/database name -- never
the password) it is about to wipe before doing anything.
"""
import argparse
import os
import sys
from urllib.parse import urlsplit

# Make "app.*" importable regardless of the caller's own cwd, the same way
# Backend/backend/seed.py already does it: insert THIS file's own backend
# root (the parent of this scripts/ directory) at the front of sys.path.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)


def _describe_database_url(url: str) -> str:
    """
    Renders a DATABASE_URL for display with the password stripped out, e.g.
        postgresql://postgres:***@localhost:5432/ai_learning
    or, for a file-based sqlite URL (no host/credentials to redact):
        sqlite:////tmp/demo_test.db
    Falls back to a generic "cannot be safely displayed" message rather than
    ever risking printing a credential if parsing fails for any reason.
    """
    try:
        if url.startswith("sqlite"):
            return url
        parts = urlsplit(url)
        host = parts.hostname or "?"
        port = f":{parts.port}" if parts.port else ""
        db = parts.path.lstrip("/") or "?"
        user = parts.username or "?"
        scheme = parts.scheme or "?"
        return f"{scheme}://{user}:***@{host}{port}/{db}"
    except Exception:
        return "<database URL could not be parsed for safe display>"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="DESTRUCTIVE: drops and recreates every table in the app's "
                    "configured database, then re-bootstraps the Super Admin."
    )
    parser.add_argument(
        "--yes-i-am-sure",
        action="store_true",
        help="Required confirmation flag. Without it, nothing is touched.",
    )
    args = parser.parse_args()

    # Import settings only after argparse -- so --help works even if the app
    # package/config can't be imported for some unrelated reason.
    from app.core.config import settings

    target_description = _describe_database_url(settings.DATABASE_URL)

    print("=" * 78)
    print("reset_demo_db.py -- DESTRUCTIVE full database reset")
    print("=" * 78)
    print(f"Target database (from settings.DATABASE_URL): {target_description}")
    print()
    print("This will PERMANENTLY DELETE every row in every table of that")
    print("database (all schools, users, courses, submissions, everything),")
    print("then recreate empty tables and a single Super Admin account.")
    print()

    if not args.yes_i_am_sure:
        print("Refusing to run: pass --yes-i-am-sure to confirm you want to do this.")
        print()
        print("    python scripts/reset_demo_db.py --yes-i-am-sure")
        return 1

    # Import everything else only now, after confirmation, and mirror
    # app/main.py's own model-registration pattern: import app.models so every
    # model module is registered on Base.metadata before drop_all/create_all runs.
    from app.core.database import Base, engine, SessionLocal
    import app.models  # noqa: F401  -- registers every table on Base.metadata
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash

    table_names = sorted(Base.metadata.tables.keys())
    print(f"Dropping {len(table_names)} table(s): {', '.join(table_names)}")
    Base.metadata.drop_all(bind=engine)

    print(f"Recreating {len(table_names)} table(s)...")
    Base.metadata.create_all(bind=engine)

    print("Recreating bootstrap Super Admin...")
    db = SessionLocal()
    try:
        super_admin = User(
            email=settings.FIRST_SUPERUSER,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Platform Super Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(super_admin)
        db.commit()
    finally:
        db.close()

    print()
    print("=" * 78)
    print("DONE. Clean slate.")
    print(f"  - {len(table_names)} tables dropped and recreated (now empty).")
    print("  - Super Admin recreated and ready to log in:")
    print(f"      email:    {settings.FIRST_SUPERUSER}")
    print("      password: (whatever FIRST_SUPERUSER_PASSWORD is set to in .env)")
    print()
    print("You do NOT need to restart the running server for this to take effect")
    print("on the Super Admin account -- it was just created directly in the")
    print("database. Existing server processes keep using the same database")
    print("connection and will see these changes immediately.")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
