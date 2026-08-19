from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # type: ignore[reportMissingImports]
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, LoginResponse, UserAuthResponse
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

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