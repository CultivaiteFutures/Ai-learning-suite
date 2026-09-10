from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, UserRole
from app.models.school import School
from app.models.platform import Subscription, ActivityLog, PlatformSetting
from app.models.course import Course, Module, Lesson
from app.models.lms import Grade
from app.core.security import get_password_hash, generate_temp_password
from app.schemas.school import SchoolCreate, SchoolResponse, SchoolUpdate, SubscriptionResponse, SubscriptionUpdate
from app.schemas.course import CourseCreate, CourseResponse
from app.schemas.user import UserResponse
from app.schemas.platform import MaintenanceStatusResponse, MaintenanceUpdate, PlatformBrandingResponse, PlatformBrandingUpdate
from app.schemas.complaint import ComplaintResponse, ComplaintUpdate
from app.models.complaint import Complaint, ComplaintStatus

router = APIRouter(dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN]))])

@router.post("/schools", response_model=SchoolResponse)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db), admin: User = Depends(require_roles([UserRole.SUPER_ADMIN]))):
    school = School(
        name=payload.name,
        domain=payload.domain,
        ai_provider=payload.ai_provider or "gemini"
    )
    db.add(school)
    # school.id is populated by the model's Python-side default= at flush
    # time, not at construction -- it's None until this flush happens, so
    # every Grade below (and anything else referencing school.id before the
    # commit further down) would otherwise crash with a NOT NULL violation.
    db.flush()

    # Every school starts with a full Kindergarten-through-Grade-12 grade
    # roster so admins/teachers can immediately assign students, courses,
    # and assignments at any grade level instead of having to add each
    # grade by hand first.
    for grade_name in ["Kindergarten"] + [f"Grade {n}" for n in range(1, 13)]:
        db.add(Grade(school_id=school.id, name=grade_name, code=grade_name))

    db.commit()
    db.refresh(school)

    # Subscription
    sub = Subscription(school_id=school.id, plan=payload.plan or "Professional", status="active")
    db.add(sub)

    # Optional Admin Creation. If an admin email is given without a password,
    # generate a secure one server-side (same approach used platform-wide --
    # see generate_temp_password) instead of requiring the caller to supply one.
    generated_admin_password = None
    if payload.admin_email:
        admin_password = payload.admin_password.strip() if payload.admin_password and payload.admin_password.strip() else None
        if not admin_password:
            admin_password = generate_temp_password(payload.admin_name or school.name)
            generated_admin_password = admin_password
        admin_user = User(
            email=payload.admin_email,
            hashed_password=get_password_hash(admin_password),
            full_name=payload.admin_name or f"{school.name} Admin",
            role=UserRole.ADMIN,
            school_id=school.id
        )
        db.add(admin_user)

    # Log Activity
    log = ActivityLog(user_id=admin.id, user_name=admin.full_name, action="SCHOOL_CREATED", details=f"Created school: {school.name}")
    db.add(log)

    db.commit()
    db.refresh(school)
    if generated_admin_password:
        school.generated_admin_password = generated_admin_password
    return school


@router.get("/schools", response_model=List[SchoolResponse])
def get_all_schools(db: Session = Depends(get_db)):
    schools = db.query(School).all()
    for s in schools:
        s.student_count = db.query(User).filter(User.school_id == s.id, User.role == UserRole.STUDENT).count()
        s.teacher_count = db.query(User).filter(User.school_id == s.id, User.role == UserRole.TEACHER).count()
        s.course_count = db.query(Course).filter(Course.school_id == s.id).count()
        s.admin_user = db.query(User).filter(User.school_id == s.id, User.role == UserRole.ADMIN).first()
        sub = db.query(Subscription).filter(Subscription.school_id == s.id).first()
        s.subscription_plan = sub.plan if sub else "Professional"
    return schools


@router.get("/schools/{school_id}", response_model=SchoolResponse)
def get_school_by_id(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.student_count = db.query(User).filter(User.school_id == school.id, User.role == UserRole.STUDENT).count()
    school.teacher_count = db.query(User).filter(User.school_id == school.id, User.role == UserRole.TEACHER).count()
    school.course_count = db.query(Course).filter(Course.school_id == school.id).count()
    school.admin_user = db.query(User).filter(User.school_id == school.id, User.role == UserRole.ADMIN).first()
    sub = db.query(Subscription).filter(Subscription.school_id == school.id).first()
    school.subscription_plan = sub.plan if sub else "Professional"
    return school


def _require_school(db: Session, school_id: str) -> School:
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school


@router.get("/schools/{school_id}/teachers", response_model=List[UserResponse])
def get_school_teachers(school_id: str, db: Session = Depends(get_db)):
    """
    The School Details page's Teachers tab -- a Super Admin has no
    school_id of their own on their token (get_current_school_id only
    resolves for a school-scoped role), so this takes the school id from
    the URL instead, the same way the other /schools/{school_id}/... routes
    in this file already do.
    """
    _require_school(db, school_id)
    return db.query(User).filter(User.school_id == school_id, User.role == UserRole.TEACHER).all()


@router.get("/schools/{school_id}/students", response_model=List[UserResponse])
def get_school_students(school_id: str, db: Session = Depends(get_db)):
    """The School Details page's Students tab -- see get_school_teachers's docstring."""
    _require_school(db, school_id)
    return db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).all()


@router.get("/schools/{school_id}/courses", response_model=List[CourseResponse])
def get_school_courses(school_id: str, db: Session = Depends(get_db)):
    """The School Details page's Courses tab -- see get_school_teachers's docstring."""
    _require_school(db, school_id)
    return db.query(Course).filter(Course.school_id == school_id).all()


@router.put("/schools/{school_id}", response_model=SchoolResponse)
def update_school(school_id: str, payload: SchoolUpdate, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    if payload.name is not None:
        school.name = payload.name
    if payload.domain is not None:
        school.domain = payload.domain
    if payload.is_active is not None:
        school.is_active = payload.is_active
    if payload.ai_provider is not None:
        school.ai_provider = payload.ai_provider

    # Update or create School Admin user credentials if provided
    admin_user = db.query(User).filter(User.school_id == school.id, User.role == UserRole.ADMIN).first()
    if admin_user:
        if payload.admin_email:
            admin_user.email = payload.admin_email
        if payload.admin_name:
            admin_user.full_name = payload.admin_name
        if payload.admin_password and payload.admin_password.strip():
            admin_user.hashed_password = get_password_hash(payload.admin_password.strip())
    elif payload.admin_email and payload.admin_password:
        admin_user = User(
            email=payload.admin_email,
            hashed_password=get_password_hash(payload.admin_password.strip()),
            full_name=payload.admin_name or f"{school.name} Admin",
            role=UserRole.ADMIN,
            school_id=school.id
        )
        db.add(admin_user)

    # Update subscription plan if provided
    if payload.plan:
        sub = db.query(Subscription).filter(Subscription.school_id == school.id).first()
        if sub:
            sub.plan = payload.plan
        else:
            db.add(Subscription(school_id=school.id, plan=payload.plan, status="active"))

    db.commit()
    db.refresh(school)
    school.admin_user = db.query(User).filter(User.school_id == school.id, User.role == UserRole.ADMIN).first()
    return school


@router.post("/schools/{school_id}/suspend")
def suspend_school(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.is_active = False
    db.commit()
    return {"message": "School suspended", "id": school_id, "status": "suspended"}


@router.post("/schools/{school_id}/activate")
def activate_school(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.is_active = True
    db.commit()
    return {"message": "School activated", "id": school_id, "status": "active"}


@router.delete("/schools/{school_id}")
def delete_school(school_id: str, db: Session = Depends(get_db), admin: User = Depends(require_roles([UserRole.SUPER_ADMIN]))):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    deleted_name = school.name
    db.delete(school)
    log = ActivityLog(user_id=admin.id, user_name=admin.full_name, action="SCHOOL_DELETED", details=f"Deleted school: {deleted_name}")
    db.add(log)
    db.commit()
    return {"message": "School deleted", "id": school_id}


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    total_schools = db.query(School).count()
    active_schools = db.query(School).filter(School.is_active == True).count()
    total_users = db.query(User).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_courses = db.query(Course).filter(Course.school_id.isnot(None)).count()

    return {
        "totalSchools": total_schools,
        "activeSchools": active_schools,
        "inactiveSchools": total_schools - active_schools,
        "totalUsers": total_users,
        "totalTeachers": total_teachers,
        "totalStudents": total_students,
        "totalCourses": total_courses,
    }


@router.get("/activity-logs")
def get_platform_activity_logs(
    school_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    """
    The Super Admin's own activity log -- what the Super Admin has actually
    done (creating/suspending/deleting schools, resetting a user's password
    as support, updating a complaint, toggling maintenance mode, their own
    logins), not the day-to-day Teacher/Student/School-Admin activity
    inside each school (course created, assignment graded, etc.) which
    previously flooded this view. Filtered by the *actor's* role rather
    than by school_id, since some genuinely Super-Admin actions (e.g. a
    support password reset, resolving a complaint) are still tagged with
    the affected school's id and would otherwise slip past a school_id-based
    filter. Stays a plain list (not wrapped in a pagination envelope) so
    the existing ActivityLogPage.jsx, which already does its own
    client-side search/filter/pagination via useDataTable, keeps working
    unchanged when called with no query params.
    """
    limit = max(1, min(limit, 2000))

    query = db.query(ActivityLog).join(User, ActivityLog.user_id == User.id).filter(User.role == UserRole.SUPER_ADMIN)
    if school_id:
        query = query.filter(ActivityLog.school_id == school_id)
    if action:
        query = query.filter(ActivityLog.action == action)

    return query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()


@router.get("/activity-logs/export.csv")
def export_platform_activity_logs_csv(
    school_id: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
):
    import csv
    import io as _io
    from fastapi.responses import StreamingResponse

    query = db.query(ActivityLog).join(User, ActivityLog.user_id == User.id).filter(User.role == UserRole.SUPER_ADMIN)
    if school_id:
        query = query.filter(ActivityLog.school_id == school_id)
    if action:
        query = query.filter(ActivityLog.action == action)
    logs = query.order_by(ActivityLog.timestamp.desc()).limit(5000).all()
    school_names = {s.id: s.name for s in db.query(School).all()}

    buf = _io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Timestamp", "School", "User", "Action", "Details"])
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat() if log.timestamp else "",
            school_names.get(log.school_id, "Platform"),
            log.user_name or "",
            log.action,
            log.details or "",
        ])

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=platform_activity_logs.csv"},
    )


@router.get("/subscriptions", response_model=List[SubscriptionResponse])
def get_subscriptions(db: Session = Depends(get_db)):
    rows = (
        db.query(Subscription, School.name)
        .join(School, School.id == Subscription.school_id)
        .order_by(School.name.asc())
        .all()
    )
    return [
        SubscriptionResponse(
            id=sub.id,
            school_id=sub.school_id,
            school_name=school_name,
            plan=sub.plan,
            status=sub.status,
            start_date=sub.start_date,
            end_date=sub.end_date,
        )
        for sub, school_name in rows
    ]


@router.put("/subscriptions/{school_id}", response_model=SubscriptionResponse)
def update_subscription(school_id: str, payload: SubscriptionUpdate, db: Session = Depends(get_db), admin: User = Depends(require_roles([UserRole.SUPER_ADMIN]))):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    sub = db.query(Subscription).filter(Subscription.school_id == school_id).first()
    if not sub:
        sub = Subscription(
            school_id=school_id,
            plan=payload.plan or "Professional",
            status=payload.status or "active",
        )
        db.add(sub)
    else:
        if payload.plan is not None:
            sub.plan = payload.plan
        if payload.status is not None:
            sub.status = payload.status
        if payload.end_date is not None:
            sub.end_date = payload.end_date

    # Log Activity
    log = ActivityLog(
        user_id=admin.id,
        user_name=admin.full_name,
        action="SUBSCRIPTION_UPDATED",
        details=f"Updated subscription for {school.name} (plan={sub.plan}, status={sub.status})",
    )
    db.add(log)

    db.commit()
    db.refresh(sub)
    return SubscriptionResponse(
        id=sub.id,
        school_id=sub.school_id,
        school_name=school.name,
        plan=sub.plan,
        status=sub.status,
        start_date=sub.start_date,
        end_date=sub.end_date,
    )

# ---------------------------------------------------------------------------
# AI usage/cost metering per school (Task #56). estimated_tokens is a rough
# ~4-chars-per-token approximation (see app/services/ai_usage_service.py) --
# good for comparing relative usage/cost across schools and features, not a
# billing-grade token count (the app's AI provider abstraction doesn't
# surface exact usage from the underlying Gemini/Claude API responses).
# ---------------------------------------------------------------------------
@router.get("/ai-usage")
def get_ai_usage_metering(db: Session = Depends(get_db)):
    from sqlalchemy import func
    from app.models.ai_usage import AIUsageLog

    rows = (
        db.query(
            AIUsageLog.school_id, AIUsageLog.feature,
            func.count(AIUsageLog.id).label("calls"),
            func.sum(AIUsageLog.estimated_tokens).label("tokens"),
        )
        .group_by(AIUsageLog.school_id, AIUsageLog.feature)
        .all()
    )

    schools = {s.id: s.name for s in db.query(School).all()}
    by_school = {}
    for school_id, feature, calls, tokens in rows:
        entry = by_school.setdefault(school_id, {
            "school_id": school_id,
            "school_name": schools.get(school_id, "Unknown School"),
            "total_calls": 0,
            "estimated_tokens": 0,
            "by_feature": {},
        })
        entry["total_calls"] += calls
        entry["estimated_tokens"] += int(tokens or 0)
        entry["by_feature"][feature] = {"calls": calls, "estimated_tokens": int(tokens or 0)}

    return sorted(by_school.values(), key=lambda e: e["estimated_tokens"], reverse=True)


# ---------------------------------------------------------------------------
# Super Admin support tooling (Task #58): resetting ANY user's password
# (including a School Admin's own -- school_admin.py's reset-password
# endpoint deliberately excludes ADMIN accounts, so this is the only path
# to recover a locked-out School Admin), plus a lightweight internal notes
# log per school for support/customer-success tracking.
# ---------------------------------------------------------------------------
@router.post("/users/{user_id}/reset-password", response_model=UserResponse)
def support_reset_user_password(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_password = generate_temp_password(user.full_name, fallback=user.role.value.title())
    user.hashed_password = get_password_hash(new_password)

    log = ActivityLog(
        school_id=user.school_id, user_id=admin.id, user_name=admin.full_name,
        action="SUPPORT_PASSWORD_RESET", details=f"Super Admin reset password for {user.role.value.title()}: {user.full_name}",
    )
    db.add(log)
    db.commit()
    db.refresh(user)
    user.generated_password = new_password
    return user


@router.get("/schools/{school_id}/support-notes")
def list_support_notes(school_id: str, db: Session = Depends(get_db)):
    from app.models.support_note import SchoolSupportNote

    notes = (
        db.query(SchoolSupportNote)
        .filter(SchoolSupportNote.school_id == school_id)
        .order_by(SchoolSupportNote.created_at.desc())
        .all()
    )
    return [
        {"id": n.id, "note": n.note, "author_name": n.author_name, "created_at": n.created_at}
        for n in notes
    ]


@router.post("/schools/{school_id}/support-notes")
def add_support_note(
    school_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    from app.models.support_note import SchoolSupportNote

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    text = (payload.get("note") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Note text is required")

    note = SchoolSupportNote(school_id=school_id, author_id=admin.id, author_name=admin.full_name, note=text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "note": note.note, "author_name": note.author_name, "created_at": note.created_at}
def _get_or_create_platform_setting(db: Session) -> PlatformSetting:
    setting = db.query(PlatformSetting).filter(PlatformSetting.id == "global").first()
    if not setting:
        setting = PlatformSetting(id="global", maintenance_mode=False)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("/maintenance", response_model=MaintenanceStatusResponse)
def get_maintenance_settings(db: Session = Depends(get_db)):
    """Super Admin's own view of the maintenance toggle (mirrors the public
    /auth/maintenance-status check used by every other role)."""
    return _get_or_create_platform_setting(db)

@router.get("/settings", response_model=PlatformBrandingResponse)
def get_platform_settings(db: Session = Depends(get_db)):
    """The Platform Settings page's General card -- platform name and
    support contact, surfaced platform-wide via /auth/maintenance-status."""
    return _get_or_create_platform_setting(db)


@router.put("/settings", response_model=PlatformBrandingResponse)
def update_platform_settings(
    payload: PlatformBrandingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    setting = _get_or_create_platform_setting(db)
    name = (payload.platform_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name is required")
    setting.platform_name = name
    setting.support_email = (payload.support_email or "").strip() or None
    setting.updated_by_id = admin.id
    db.commit()
    db.refresh(setting)
    return setting


@router.put("/maintenance", response_model=MaintenanceStatusResponse)
def update_maintenance_settings(
    payload: MaintenanceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    setting = _get_or_create_platform_setting(db)
    setting.maintenance_mode = payload.maintenance_mode
    setting.maintenance_message = payload.maintenance_message
    setting.updated_by_id = admin.id
    db.commit()
    db.refresh(setting)

    try:
        db.add(ActivityLog(
            school_id=None,
            user_id=admin.id,
            user_name=admin.full_name,
            action="MAINTENANCE_MODE_ENABLED" if setting.maintenance_mode else "MAINTENANCE_MODE_DISABLED",
            details=setting.maintenance_message or "",
        ))
        db.commit()
    except Exception:
        db.rollback()

    return setting
@router.get("/complaints", response_model=List[ComplaintResponse])
def list_complaints(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Task #66: the Super Admin's complaint queue -- every School Admin's
    submitted complaint across every school, newest first."""
    query = db.query(Complaint)
    if status_filter:
        query = query.filter(Complaint.status == status_filter.upper())
    complaints = query.order_by(Complaint.created_at.desc()).all()
    for c in complaints:
        c.school_name = c.school.name if c.school else None
    return complaints


@router.put("/complaints/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.SUPER_ADMIN])),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if payload.status is not None:
        new_status = payload.status.upper()
        valid_statuses = {s.value for s in ComplaintStatus}
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {sorted(valid_statuses)}")
        complaint.status = new_status
        if new_status == ComplaintStatus.RESOLVED.value:
            complaint.resolved_at = datetime.now(timezone.utc)
    if payload.resolution_note is not None:
        complaint.resolution_note = payload.resolution_note

    db.add(ActivityLog(
        school_id=complaint.school_id, user_id=admin.id, user_name=admin.full_name,
        action="COMPLAINT_UPDATED", details=f"{complaint.subject} -> {complaint.status}",
    ))
    db.commit()
    db.refresh(complaint)
    complaint.school_name = complaint.school.name if complaint.school else None
    return complaint
