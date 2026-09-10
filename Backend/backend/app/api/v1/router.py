from fastapi import APIRouter
from app.api.v1 import auth, super_admin, school_admin, teacher, student, parent, ai, announcements, discussions, calendar, challenges, games, notifications, messaging, attendance, rubrics, sso

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["Super Admin"])
api_router.include_router(school_admin.router, prefix="/school-admin", tags=["School Admin"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["Teacher"])
api_router.include_router(student.router, prefix="/student", tags=["Student"])
api_router.include_router(parent.router, prefix="/parent", tags=["Parent"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Integration"])
api_router.include_router(announcements.router, tags=["Announcements"])
api_router.include_router(discussions.router, tags=["Discussions"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Academic Calendar"])
api_router.include_router(challenges.router, tags=["Challenges"])
api_router.include_router(games.router, tags=["Fun Games"])
api_router.include_router(notifications.router, tags=["Notifications"])
api_router.include_router(messaging.router, tags=["Messaging"])
api_router.include_router(attendance.router, tags=["Attendance"])
api_router.include_router(rubrics.router, tags=["Rubrics"])
api_router.include_router(sso.router, prefix="/sso", tags=["SSO"])
