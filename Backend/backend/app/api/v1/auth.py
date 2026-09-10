from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session  # type: ignore[reportMissingImports]
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.rate_limit import limiter
from app.schemas.auth import LoginRequest, LoginResponse, UserAuthResponse
from app.models.user import User, UserRole
from app.api.deps import get_current_user
from app.models.platform import ActivityLog, PlatformSetting
from app.schemas.platform import MaintenanceStatusResponse

router = APIRouter()

# Tighter than the app-wide 300/minute default (app/core/rate_limit.py) --
# login is the actual brute-force target, so a real client mistyping a
# password a couple of times is fine, but 10 attempts/minute per IP is
# plenty for that and not for a password-guessing script.
@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    # Login is matched case-insensitively (and with surrounding whitespace
    # trimmed) against the stored email -- accounts are created with
    # whatever casing an admin typed (see school_admin.py), so a user
    # typing their own email back in a different case (very common: mobile
    # keyboards auto-capitalizing, or an admin having typed "Sarah@..."
    # while the parent naturally types "sarah@...") must still match.
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        # Task #57: comprehensive platform-wide audit logging -- failed logins
        # are the single most important audit event for a school platform.
        # Logged even when the email doesn't match any user (school_id/user_id
        # left null in that case) so credential-stuffing attempts are visible
        # to the Super Admin too, not just successful account access.
        try:
            log = ActivityLog(
                school_id=user.school_id if user else None,
                user_id=user.id if user else None,
                user_name=user.full_name if user else payload.email,
                action="LOGIN_FAILED",
                details=f"Failed login attempt for '{payload.email}'",
            )
            db.add(log)
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    # Maintenance mode was previously enforced only in the React frontend
    # (which checks GET /auth/maintenance-status before showing the login
    # form) -- the backend itself never checked it, so a direct API call,
    # or any client that hadn't fetched that status yet, could still log in
    # as any role while the platform was supposedly in maintenance. The
    # Super Admin is exempt so they can always get in to turn it back off.
    if user.role != UserRole.SUPER_ADMIN:
        setting = db.query(PlatformSetting).filter(PlatformSetting.id == "global").first()
        if setting and setting.maintenance_mode:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=setting.maintenance_message or "The platform is currently undergoing scheduled maintenance. Please try again shortly.",
            )

    try:
        log = ActivityLog(school_id=user.school_id, user_id=user.id, user_name=user.full_name, action="LOGIN_SUCCESS", details=f"{user.full_name} logged in")
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()

    token = create_access_token(
        subject=user.id,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        school_id=user.school_id
    )

    school_name = user.school.name if user.school else None
    role_str = user.role.value.lower() if hasattr(user.role, 'value') else str(user.role).lower()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserAuthResponse(
            id=user.id,
            name=user.full_name,
            email=user.email,
            role=role_str,
            school_id=user.school_id,
            school_name=school_name
        )
    )

@router.get("/me", response_model=UserAuthResponse)
def get_me(current_user: User = Depends(get_current_user)):
    role_str = current_user.role.value.lower() if hasattr(current_user.role, 'value') else str(current_user.role).lower()
    return UserAuthResponse(
        id=current_user.id,
        name=current_user.full_name,
        email=current_user.email,
        role=role_str,
        school_id=current_user.school_id,
        school_name=current_user.school.name if current_user.school else None
    )


@router.get("/maintenance-status", response_model=MaintenanceStatusResponse)
def get_maintenance_status(db: Session = Depends(get_db)):
    """Public (unauthenticated) check so the frontend can show a maintenance
    banner/blocking screen before -- or without -- a logged-in user. The
    Super Admin's actual toggle lives under /super-admin/maintenance."""
    setting = db.query(PlatformSetting).filter(PlatformSetting.id == "global").first()
    if not setting:
        return MaintenanceStatusResponse(
            maintenance_mode=False, maintenance_message=None,
            platform_name="AI Learning Suite", support_email=None, updated_at=None,
        )
    return MaintenanceStatusResponse(
        maintenance_mode=setting.maintenance_mode,
        maintenance_message=setting.maintenance_message,
        platform_name=setting.platform_name,
        support_email=setting.support_email,
        updated_at=setting.updated_at,
    )
