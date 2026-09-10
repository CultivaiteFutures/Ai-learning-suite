"""Read-only endpoints for the PARENT role: a guardian's own linked
children's courses, assignments/grades, and stats. Mirrors the equivalent
STUDENT endpoints in student.py, but every route is scoped to a specific
child and the link is verified against ParentStudentLink first -- a parent
must never be able to view a student they aren't actually linked to, even
by guessing another student's id in the URL.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Enrollment, Assignment, Submission, StudentStats, ParentStudentLink
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.schemas.course import CourseResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.PARENT]))])


def _get_linked_child(db: Session, parent_id: str, student_id: str, school_id: str) -> User:
    link = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == parent_id,
        ParentStudentLink.student_id == student_id,
        ParentStudentLink.school_id == school_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="No linked child with this id")
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Linked child account no longer exists")
    return student


@router.get("/children")
def get_children(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.parent_id == current_user.id,
        ParentStudentLink.school_id == school_id,
    ).all()
    results = []
    for link in links:
        student = db.query(User).filter(User.id == link.student_id).first()
        if not student:
            continue
        results.append({
            "id": student.id,
            "name": student.full_name,
            "email": student.email,
            "gradeName": student.grade.name if student.grade else None,
            "section": student.section,
            "isActive": student.is_active,
        })
    return results


@router.get("/children/{student_id}/stats")
def get_child_stats(
    student_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    _get_linked_child(db, current_user.id, student_id, school_id)
    stats = db.query(StudentStats).filter(StudentStats.student_id == student_id).first()
    if not stats:
        return {"xp": 0, "streak_days": 0, "badges": []}
    return {"xp": stats.xp, "streak_days": stats.streak_days, "badges": stats.badges or []}


@router.get("/children/{student_id}/courses", response_model=List[CourseResponse])
def get_child_courses(
    student_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    _get_linked_child(db, current_user.id, student_id, school_id)
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.school_id == school_id
    ).all()
    course_ids = [e.course_id for e in enrollments]
    if not course_ids:
        return []
    return db.query(Course).filter(Course.id.in_(course_ids), Course.is_published == True).all()


@router.get("/children/{student_id}/assignments")
def get_child_assignments(
    student_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    _get_linked_child(db, current_user.id, student_id, school_id)

    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id, Enrollment.school_id == school_id
    ).all()
    course_ids = [e.course_id for e in enrollments]
    if not course_ids:
        return []

    assignments = db.query(Assignment).filter(
        Assignment.school_id == school_id,
        Assignment.course_id.in_(course_ids)
    ).all()

    results = []
    now = datetime.now(timezone.utc)
    for a in assignments:
        course = db.query(Course).filter(Course.id == a.course_id).first()
        submission = db.query(Submission).filter(
            Submission.assignment_id == a.id,
            Submission.student_id == student_id
        ).first()

        if submission:
            status_str = "Graded" if submission.grade_points is not None else "Submitted"
        elif a.due_date and (
            a.due_date if a.due_date.tzinfo else a.due_date.replace(tzinfo=timezone.utc)
        ) < now:
            status_str = "Overdue"
        else:
            status_str = "Not Started"

        results.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "courseId": a.course_id,
            "courseName": course.title if course else "Course",
            "dueDate": a.due_date.isoformat() if a.due_date else None,
            "maxPoints": a.max_points or 100,
            "type": getattr(a, "type", None) or "Quiz",
            "status": status_str,
            "submission": {
                "id": submission.id,
                "content": submission.content,
                "fileUrl": submission.file_url,
                "gradePoints": submission.grade_points,
                "feedback": submission.feedback,
                "submittedAt": submission.submitted_at.isoformat() if submission.submitted_at else None
            } if submission else None
        })

    return results

@router.get("/children/{student_id}/attendance")
def get_child_attendance(
    student_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """Same shape as GET /student/attendance, but for a linked child --
    _get_linked_child raises 404 if this parent isn't actually linked to
    student_id, so a parent can never view an unrelated student's record
    by guessing an id in the URL."""
    _get_linked_child(db, current_user.id, student_id, school_id)

    course_ids = {
        row[0]
        for row in db.query(Enrollment.course_id)
        .filter(Enrollment.school_id == school_id, Enrollment.student_id == student_id)
        .all()
    }
    if not course_ids:
        return {"records": [], "summary": []}

    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()}
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student_id, AttendanceRecord.course_id.in_(course_ids))
        .order_by(AttendanceRecord.date.desc())
        .all()
    )

    by_course = {}
    for r in records:
        by_course.setdefault(r.course_id, []).append(r)

    summary = []
    for course_id, recs in by_course.items():
        course = courses.get(course_id)
        total = len(recs)
        present = sum(1 for r in recs if r.status == AttendanceStatus.PRESENT)
        late = sum(1 for r in recs if r.status == AttendanceStatus.LATE)
        absent = sum(1 for r in recs if r.status == AttendanceStatus.ABSENT)
        excused = sum(1 for r in recs if r.status == AttendanceStatus.EXCUSED)
        summary.append({
            "course_id": course_id,
            "course_name": course.title if course else "Course",
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "excused_count": excused,
            "total_days": total,
            "attendance_rate": round(((present + late) / total) * 100, 1) if total else 0.0,
        })

    return {
        "records": [
            {
                "id": r.id,
                "course_id": r.course_id,
                "course_name": courses[r.course_id].title if r.course_id in courses else "Course",
                "date": r.date.isoformat(),
                "status": r.status.value,
                "notes": r.notes,
            }
            for r in records
        ],
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# Data export & deletion-on-request (Task #61) -- a parent's own "right to
# access" copy of a linked child's data (COPPA gives parents this right
# directly), and a way to request the child's account be erased. Both routes
# re-verify the parent/child link via _get_linked_child before touching
# anything -- a parent can never reach a child they aren't actually linked to.
# ---------------------------------------------------------------------------
@router.get("/children/{student_id}/export-data")
def export_child_data(
    student_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    import json as _json
    from app.services.data_export_service import export_student_data

    student = _get_linked_child(db, current_user.id, student_id, school_id)
    data = export_student_data(db, student)
    return Response(
        content=_json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={student.full_name.replace(' ', '_')}-data-export.json"},
    )


@router.post("/children/{student_id}/request-deletion")
def request_child_deletion(
    student_id: str,
    payload: dict = {},
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    from app.models.data_request import DataDeletionRequest

    student = _get_linked_child(db, current_user.id, student_id, school_id)

    existing = db.query(DataDeletionRequest).filter(
        DataDeletionRequest.student_id == student.id,
        DataDeletionRequest.status == "pending",
    ).first()
    if existing:
        return {"message": "A deletion request is already pending review by the school admin.", "id": existing.id}

    request_row = DataDeletionRequest(
        school_id=school_id,
        student_id=student.id,
        student_name=student.full_name,
        requested_by_id=current_user.id,
        requested_by_role="PARENT",
        note=(payload or {}).get("note"),
    )
    db.add(request_row)
    db.commit()
    db.refresh(request_row)
    return {"message": "Deletion request submitted. The school admin will review it.", "id": request_row.id}
