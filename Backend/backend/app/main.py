import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.rate_limit import limiter
from app.api.v1.router import api_router
from app.core.database import Base, engine

# Create tables if database connection is available
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Database table initialization deferred: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Rate limiting -- a generous global ceiling per client IP (300/min) as a
# defense-in-depth backstop against runaway scripts/DoS, plus a much
# tighter per-route limit on login (see app/api/v1/auth.py) since that's
# the actual brute-force target. 429 Too Many Requests on breach.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Serves uploaded assignment-submission files (photos/PDFs of student work).
# Local disk storage under the backend's own working directory -- fine for
# this single-instance dev/deploy setup; would move to object storage (S3 or
# similar) behind the same /uploads URL shape if this ever runs multi-instance.
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(UPLOADS_DIR, "submissions"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.on_event("startup")
def start_background_jobs():
    """Fires the daily due-soon-assignment-reminder sweep once now (so it's
    not silent for 24h after a fresh deploy/restart) and then every 24h
    after that -- see app/services/scheduled_jobs.py for why this is a
    simple in-process scheduler rather than external job infra."""
    from app.services.scheduled_jobs import send_due_soon_reminders, start_scheduler
    try:
        send_due_soon_reminders()
    except Exception as e:
        print(f"Due-soon reminder sweep note: {e}")
    try:
        start_scheduler()
    except Exception as e:
        print(f"Background scheduler note: {e}")


@app.on_event("startup")
def init_superadmin():
    from app.core.database import SessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        superadmin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
        if not superadmin:
            admin = User(
                email=settings.FIRST_SUPERUSER,
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                full_name="Platform Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Bootstrap Super Admin initialized: {settings.FIRST_SUPERUSER}")
    except Exception as e:
        print(f"Super admin initialization note: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "AI Learning Suite FastAPI Backend Running", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}