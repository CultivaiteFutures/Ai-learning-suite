"""
One-time database setup script.

Per the platform's data policy, this does NOT create any demo/mock schools,
teachers, students, or courses. A brand new database should start completely
empty -- every school, user, course, and piece of content must come from
real Super Admin / School Admin / Teacher actions through the app.

All this script does is:
  1. Create any tables that don't exist yet (safety net alongside Alembic).
  2. Bootstrap the single platform Super Admin account, using the
     credentials configured in .env (FIRST_SUPERUSER / FIRST_SUPERUSER_PASSWORD),
     so there is always at least one account that can log in and start
     onboarding real schools. This is idempotent -- running it again will
     not create a second Super Admin or touch any other data.

This mirrors the startup bootstrap that already runs automatically in
app/main.py (init_superadmin) -- this script exists so the same bootstrap
can also be run explicitly/offline (e.g. in a deploy step) without booting
the whole API.
"""
import sys
import os

# Add root backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole

# Import every model module so Base.metadata is fully populated before create_all runs.
import app.models.school  # noqa: F401
import app.models.user  # noqa: F401
import app.models.course  # noqa: F401
import app.models.lms  # noqa: F401
import app.models.platform  # noqa: F401


def seed_db():
    print("Creating any missing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_super_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if existing_super_admin:
            print(f"Super Admin already exists ({existing_super_admin.email}) -- nothing to do.")
            return

        super_admin = User(
            email=settings.FIRST_SUPERUSER,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Platform Super Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(super_admin)
        db.commit()
        print(f"Bootstrapped Super Admin: {settings.FIRST_SUPERUSER}")
        print("Set FIRST_SUPERUSER / FIRST_SUPERUSER_PASSWORD in .env before running this "
              "against a real environment -- change the password immediately after first login.")
        print("No schools, teachers, students, or courses were created. The database is otherwise empty.")
    except Exception as e:
        db.rollback()
        print(f"Error during setup: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
