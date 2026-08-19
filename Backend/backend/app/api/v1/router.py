from fastapi import APIRouter
from app.api.v1 import auth, super_admin, school_admin, teacher, student, ai

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["Super Admin"])
api_router.include_router(school_admin.router, prefix="/school-admin", tags=["School Admin"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["Teacher"])
api_router.include_router(student.router, prefix="/student", tags=["Student"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Integration"])