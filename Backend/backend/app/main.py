from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

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