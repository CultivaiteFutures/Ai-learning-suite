import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Enrollment, ParentStudentLink, Assignment
from app.models.calendar import CalendarEvent
from app.schemas.calendar import CalendarEventCreate, CalendarEventResponse
from app.services.course_ownership import can_manage_course
from app.services.ics_service import build_ics
from app.api.v1.teacher import _owned_course_ids

router = APIRouter()

CREATE_ROLES = [UserRole.TEACHER, UserRole.ADMIN]
VIEW_ROLES = [UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT, UserRole.PARENT]


@router.post("/events", response_model=CalendarEventResponse, dependencies=[Depends(require_roles(CREATE_ROLES))])
def create_calendar_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    TEACHER: must supply a course_id belonging to their own school (course-scoped only,
    e.g. an exam date -- teachers cannot create school-wide events).
    ADMIN: may omit course_id for a school-wide event (e.g. a holiday), or supply one that
    belongs to their own school for a course-scoped event.
    created_by_id is always the caller -- never trusted from the client.
    """
    course_id = payload.course_id

    if current_user.role == UserRole.TEACHER:
        if not course_id:
            raise HTTPException(status_code=400, detail="course_id is required for a teacher-created event")
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

    if not payload.event_date:
        raise HTTPException(status_code=400, detail="event_date is required")

    event = CalendarEvent(
        school_id=school_id,
        course_id=course_id,
        title=payload.title or "Untitled Event",
        description=payload.description,
        event_date=payload.event_date,
        event_type=payload.event_type or "event",
        created_by_id=current_user.id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/events", response_model=List[CalendarEventResponse], dependencies=[Depends(require_roles(VIEW_ROLES))])
def list_calendar_events(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    STUDENT: school-wide events (course_id IS NULL) plus events for courses they are
    actually enrolled in (checked against real Enrollment rows).
    PARENT: same rule, unioned across every one of their linked children (a
    real ParentStudentLink row -- never a client-supplied student id).
    TEACHER / ADMIN: every event in their own school.
    Never returns events from another school, for any role.
    """
    base_query = db.query(CalendarEvent).filter(CalendarEvent.school_id == school_id)

    if current_user.role == UserRole.STUDENT:
        enrolled_course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id,
                Enrollment.school_id == school_id
            ).all()
        ]
        if enrolled_course_ids:
            base_query = base_query.filter(
                or_(CalendarEvent.course_id.is_(None), CalendarEvent.course_id.in_(enrolled_course_ids))
            )
        else:
            base_query = base_query.filter(CalendarEvent.course_id.is_(None))
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
                or_(CalendarEvent.course_id.is_(None), CalendarEvent.course_id.in_(enrolled_course_ids))
            )
        else:
            base_query = base_query.filter(CalendarEvent.course_id.is_(None))

    return base_query.order_by(CalendarEvent.event_date.asc()).all()


@router.delete("/events/{event_id}", dependencies=[Depends(require_roles(CREATE_ROLES))])
def delete_calendar_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Only the original creator, or an ADMIN of the event's own school, may delete it.
    """
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id,
        CalendarEvent.school_id == school_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    is_creator = event.created_by_id == current_user.id
    is_school_admin = current_user.role == UserRole.ADMIN
    if not (is_creator or is_school_admin):
        raise HTTPException(status_code=403, detail="Only the creator or a school admin may delete this event")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted", "id": event_id}


def _scoped_calendar_items(db: Session, current_user: User, school_id: str) -> List[dict]:
    """
    Builds the flat, ICS-ready list of calendar items (school/course events
    plus assignment due dates) visible to current_user -- reusing the exact
    same scoping rules as list_calendar_events (STUDENT/PARENT: school-wide
    events plus their own/their children's enrolled courses; TEACHER: their
    owned/co-taught courses via _owned_course_ids; ADMIN: unrestricted).
    Never trusts a client-supplied filter.
    """
    course_ids: Optional[List[str]] = None  # None = unrestricted (ADMIN only)

    if current_user.role == UserRole.STUDENT:
        course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id == current_user.id, Enrollment.school_id == school_id
            ).all()
        ]
    elif current_user.role == UserRole.PARENT:
        child_ids = [
            l.student_id for l in db.query(ParentStudentLink).filter(
                ParentStudentLink.parent_id == current_user.id, ParentStudentLink.school_id == school_id
            ).all()
        ]
        course_ids = [
            e.course_id for e in db.query(Enrollment).filter(
                Enrollment.student_id.in_(child_ids), Enrollment.school_id == school_id
            ).all()
        ] if child_ids else []
    elif current_user.role == UserRole.TEACHER:
        course_ids = _owned_course_ids(db, school_id, current_user)
    # ADMIN: course_ids stays None -- every event & assignment in the school.

    event_query = db.query(CalendarEvent).filter(CalendarEvent.school_id == school_id)
    assignment_query = db.query(Assignment).filter(
        Assignment.school_id == school_id, Assignment.due_date.isnot(None)
    )

    if course_ids is not None:
        event_query = event_query.filter(
            or_(CalendarEvent.course_id.is_(None), CalendarEvent.course_id.in_(course_ids))
        )
        assignment_query = assignment_query.filter(Assignment.course_id.in_(course_ids))

    items = []
    for event in event_query.all():
        items.append({
            "uid": f"event-{event.id}",
            "title": event.title,
            "description": event.description,
            "dt": event.event_date,
            "category": event.event_type or "event",
        })
    for assignment in assignment_query.all():
        items.append({
            "uid": f"assignment-{assignment.id}",
            "title": f"Due: {assignment.title}",
            "description": assignment.description,
            "dt": assignment.due_date,
            "category": "deadline",
        })

    items.sort(key=lambda i: i["dt"])
    return items


@router.get("/export.ics", dependencies=[Depends(require_roles(VIEW_ROLES))])
def export_calendar_ics(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """Downloads a point-in-time .ics snapshot of every event/deadline currently visible to the caller."""
    items = _scoped_calendar_items(db, current_user, school_id)
    ics_text = build_ics(items, calendar_name=f"{current_user.full_name}'s Academic Calendar")
    return Response(
        content=ics_text,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=academic-calendar.ics"},
    )


@router.get("/sync-token", dependencies=[Depends(require_roles(VIEW_ROLES))])
def get_or_create_sync_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns this user's standing calendar-subscription token, generating one on
    first use. This token (not a Bearer header) is the credential for the
    public GET /calendar/sync/{token}.ics route below, since calendar apps
    subscribing to a URL can't send custom auth headers. A leaked token
    exposes only that one user's own calendar view, and can be invalidated
    any time via the regenerate route.
    """
    if not current_user.calendar_sync_token:
        current_user.calendar_sync_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(current_user)
    return {"token": current_user.calendar_sync_token}


@router.post("/sync-token/regenerate", dependencies=[Depends(require_roles(VIEW_ROLES))])
def regenerate_sync_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invalidates any previously shared subscription link and issues a fresh token."""
    current_user.calendar_sync_token = secrets.token_urlsafe(24)
    db.commit()
    db.refresh(current_user)
    return {"token": current_user.calendar_sync_token}


@router.get("/sync/{token}.ics")
def sync_calendar_ics(token: str, db: Session = Depends(get_db)):
    """
    Public, unauthenticated endpoint that a calendar app (Google/Apple/Outlook)
    polls periodically to keep a subscribed calendar in sync. The token itself
    is the credential -- looked up directly, never via get_current_user -- and
    resolves to exactly one user's own scoped view; an unknown or cleared
    token returns a plain 404 rather than leaking which part failed.
    """
    user = db.query(User).filter(User.calendar_sync_token == token).first()
    if not user or not user.school_id or user.role not in VIEW_ROLES:
        raise HTTPException(status_code=404, detail="Invalid or expired calendar subscription link")

    items = _scoped_calendar_items(db, user, user.school_id)
    ics_text = build_ics(items, calendar_name=f"{user.full_name}'s Academic Calendar")
    return Response(content=ics_text, media_type="text/calendar")
