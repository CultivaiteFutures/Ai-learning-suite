from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Discussion, DiscussionReply, Enrollment
from app.services.course_ownership import can_manage_course
from app.services.notification_service import create_notification
from app.schemas.lms import (
    DiscussionCreate,
    DiscussionResponse,
    DiscussionDetailResponse,
    DiscussionReplyCreate,
    DiscussionReplyResponse,
    DiscussionResolveUpdate,
)

router = APIRouter()

PARTICIPANT_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]


def _course_in_scope(db: Session, course_id: str, school_id: str, current_user: User) -> Optional[Course]:
    """
    Resolve a course by id, but only if it belongs to the caller's own school
    and (for students) the caller is actually enrolled in it. Never trusts
    course_id alone -- mirrors the equivalent helper in app/api/v1/ai.py.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        return None
    if current_user.role == UserRole.STUDENT:
        enrolled = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.student_id == current_user.id,
            Enrollment.school_id == school_id,
        ).first()
        if not enrolled:
            return None
    return course


@router.post("/discussions", response_model=DiscussionResponse, dependencies=[Depends(require_roles(PARTICIPANT_ROLES))])
def create_discussion(
    payload: DiscussionCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    STUDENT or TEACHER only (an ADMIN posting a doubt makes little sense, but is
    also not part of this feature's design -- restrict to the two roles that
    actually have a course relationship: enrolled student, or the school's own
    teacher). Access is verified via Enrollment for students and via
    Course.school_id for teachers, same pattern used everywhere else.
    """
    if current_user.role not in (UserRole.STUDENT, UserRole.TEACHER):
        raise HTTPException(status_code=403, detail="Only students or teachers may start a discussion")

    if not payload.course_id:
        raise HTTPException(status_code=400, detail="course_id is required")

    course = _course_in_scope(db, payload.course_id, school_id, current_user)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    discussion = Discussion(
        school_id=school_id,
        course_id=course.id,
        lesson_id=payload.lesson_id,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
        is_resolved=False,
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    return discussion


@router.get("/discussions", response_model=List[DiscussionResponse], dependencies=[Depends(require_roles(PARTICIPANT_ROLES))])
def list_discussions(
    course_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Only for a course the caller can actually access: an enrolled student, or
    the course's own school's teacher/admin. course_id is never trusted on
    its own -- always re-verified server-side.
    """
    course = _course_in_scope(db, course_id, school_id, current_user)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")

    return db.query(Discussion).filter(
        Discussion.course_id == course.id,
        Discussion.school_id == school_id
    ).order_by(Discussion.created_at.desc()).all()


@router.get("/discussions/{discussion_id}", response_model=DiscussionDetailResponse, dependencies=[Depends(require_roles(PARTICIPANT_ROLES))])
def get_discussion_detail(
    discussion_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    discussion = db.query(Discussion).filter(
        Discussion.id == discussion_id,
        Discussion.school_id == school_id
    ).first()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    course = _course_in_scope(db, discussion.course_id, school_id, current_user)
    if not course:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    return discussion


@router.post("/discussions/{discussion_id}/replies", response_model=DiscussionReplyResponse, dependencies=[Depends(require_roles(PARTICIPANT_ROLES))])
def create_discussion_reply(
    discussion_id: str,
    payload: DiscussionReplyCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Same access rule as viewing the discussion -- enrolled student in the
    discussion's course, or the course's own school's teacher/admin.
    """
    discussion = db.query(Discussion).filter(
        Discussion.id == discussion_id,
        Discussion.school_id == school_id
    ).first()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    course = _course_in_scope(db, discussion.course_id, school_id, current_user)
    if not course:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    reply = DiscussionReply(
        discussion_id=discussion.id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(reply)

    try:
        if discussion.author_id and discussion.author_id != current_user.id:
            # Pick the link based on the original author's role when cheaply
            # available; default to the student route (minor UX nicety, not a
            # correctness concern -- the recipient could be a teacher too).
            author = discussion.author
            author_link = "/teacher/discussions" if author and author.role == UserRole.TEACHER else "/student/discussions"
            create_notification(
                db, school_id=school_id, user_id=discussion.author_id,
                type="discussion_reply", title="New reply to your question",
                message=f"{current_user.full_name} replied to your discussion.",
                link=author_link,
            )
    except Exception:
        pass

    db.commit()
    db.refresh(reply)
    return reply


@router.patch("/discussions/{discussion_id}", response_model=DiscussionResponse, dependencies=[Depends(require_roles(PARTICIPANT_ROLES))])
def update_discussion_resolved_status(
    discussion_id: str,
    payload: DiscussionResolveUpdate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Resolved-flag only. May be set by the discussion's own author, or by a
    teacher/admin who has access to the discussion's course.
    """
    discussion = db.query(Discussion).filter(
        Discussion.id == discussion_id,
        Discussion.school_id == school_id
    ).first()
    if not discussion:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    # Access check first (404 if the caller can't even see this discussion --
    # same rule as every other route in this file), THEN the narrower
    # edit-permission check (403) for someone who can see it but may not
    # change it. Keeps the two failure modes consistent across the file.
    course = _course_in_scope(db, discussion.course_id, school_id, current_user)
    if not course:
        raise HTTPException(status_code=404, detail="Discussion not found or access denied")

    is_author = discussion.author_id == current_user.id
    # TEACHER may only moderate a discussion on a course they own (or an
    # orphaned course, per the course-ownership fallback); ADMIN is always
    # unrestricted. can_manage_course already encodes exactly that rule.
    is_staff = can_manage_course(db, course, current_user)
    if not (is_author or is_staff):
        raise HTTPException(status_code=403, detail="Only the author or a teacher/admin may update this discussion")

    if payload.is_resolved is not None:
        discussion.is_resolved = payload.is_resolved

    db.commit()
    db.refresh(discussion)
    return discussion
