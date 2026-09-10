from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Announcement, Enrollment, ParentStudentLink
from app.schemas.lms import AnnouncementCreate, AnnouncementResponse
from app.services.course_ownership import can_manage_course
from app.services.notification_service import create_notification

router = APIRouter()

CREATE_ROLES = [UserRole.TEACHER, UserRole.ADMIN]
VIEW_ROLES = [UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT, UserRole.PARENT]


@router.post("/announcements", response_model=AnnouncementResponse, dependencies=[Depends(require_roles(CREATE_ROLES))])
def create_announcement(
    payload: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    TEACHER: must supply a course_id belonging to their own school (course-scoped only).
    ADMIN: may omit course_id for a school-wide announcement, or supply one that
    belongs to their own school for a course-scoped announcement.
    author_id is always the caller -- never trusted from the client.
    """
    course_id = payload.course_id

    if current_user.role == UserRole.TEACHER:
        if not course_id:
            raise HTTPException(status_code=400, detail="course_id is required for a teacher announcement")
        course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found or access denied")
        if not can_manage_course(db, course, current_user):
            raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    else:  # ADMIN
        if course_id:
            course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
            if not course:
                raise HTTPException(status_code=404, detail="Course not found or access denied")

    announcement = Announcement(
        school_id=school_id,
        course_id=course_id,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
    )
    db.add(announcement)

    # Notify the real recipients: students enrolled in the course (course-scoped
    # announcement) or every student in the school (school-wide, Admin only).
    # Never lets a notification hiccup break the announcement itself.
    try:
        if course_id:
            recipient_ids = [
                e.student_id for e in db.query(Enrollment).filter(
                    Enrollment.course_id == course_id,
                    Enrollment.school_id == school_id
                ).all()
            ]
        else:
            recipient_ids = [
                u.id for u in db.query(User).filter(
                    User.school_id == school_id, User.role == UserRole.STUDENT
                ).all()
            ]

        for student_id in recipient_ids:
            create_notification(
                db, school_id=school_id, user_id=student_id,
                type="announcement", title="New announcement",
                message=announcement.title,
                link="/student/announcements",
            )
    except Exception:
        pass

    db.commit()
    db.refresh(announcement)
    return announcement


@router.get("/announcements", response_model=List[AnnouncementResponse], dependencies=[Depends(require_roles(VIEW_ROLES))])
def list_announcements(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    STUDENT: school-wide announcements (course_id IS NULL) plus announcements for
    courses they are actually enrolled in (checked against real Enrollment rows).
    PARENT: same rule, but unioned across every one of their linked children
    (a real ParentStudentLink row -- never a client-supplied student id).
    TEACHER / ADMIN: every announcement in their own school.
    Never returns announcements from another school, for any role.
    """
    base_query = db.query(Announcement).filter(Announcement.school_id == school_id)

    if current_user.role == UserRole.STUDENT:
        enrolled_course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.school_id == school_id
            ).all()
        ]
        if enrolled_course_ids:
            base_query = base_query.filter(
                or_(Announcement.course_id.is_(None), Announcement.course_id.in_(enrolled_course_ids))
            )
        else:
            base_query = base_query.filter(Announcement.course_id.is_(None))
    elif current_user.role == UserRole.PARENT:
        child_ids = [
            l.student_id for l in db.query(ParentStudentLink).filter(
                ParentStudentLink.parent_id == current_user.id,
                ParentStudentLink.school_id == school_id,
            ).all()
        ]
        enrolled_course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id.in_(child_ids),
                Enrollment.school_id == school_id
            ).all()
        ] if child_ids else []
        if enrolled_course_ids:
            base_query = base_query.filter(
                or_(Announcement.course_id.is_(None), Announcement.course_id.in_(enrolled_course_ids))
            )
        else:
            base_query = base_query.filter(Announcement.course_id.is_(None))

    return base_query.order_by(Announcement.created_at.desc()).all()


@router.delete("/announcements/{announcement_id}", dependencies=[Depends(require_roles(CREATE_ROLES))])
def delete_announcement(
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Only the original author, or an ADMIN of the announcement's own school, may delete it.
    """
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.school_id == school_id
    ).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found or access denied")

    is_author = announcement.author_id == current_user.id
    is_school_admin = current_user.role == UserRole.ADMIN
    if not (is_author or is_school_admin):
        raise HTTPException(status_code=403, detail="Only the author or a school admin may delete this announcement")

    db.delete(announcement)
    db.commit()
    return {"message": "Announcement deleted", "id": announcement_id}
