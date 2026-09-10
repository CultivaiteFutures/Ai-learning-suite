"""
Attendance module (Task #45): a Teacher or Admin marks per-course, per-day
attendance for the students enrolled in that course. Reusing
can_manage_course (the same ownership rule as every other teacher-facing
write in this app -- see app/services/course_ownership.py) so a teacher can
only take attendance for their own courses, never another teacher's.

Student/Parent self-service views live in app/api/v1/student.py and
app/api/v1/parent.py respectively (matching this codebase's existing
convention of role-scoped student/parent endpoints living in those files
rather than a shared one), and a school-wide overview for Admin lives in
app/api/v1/school_admin.py.
"""
from datetime import date as date_type
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Enrollment, ParentStudentLink
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.services.course_ownership import can_manage_course
from app.services.notification_service import create_notification
from app.schemas.attendance import (
    AttendanceMarkRequest,
    AttendanceRosterEntry,
    AttendanceSummaryEntry,
)

router = APIRouter(dependencies=[Depends(require_roles([UserRole.TEACHER, UserRole.ADMIN]))])

VALID_STATUSES = {s.value for s in AttendanceStatus}


def _get_manageable_course(db: Session, course_id: str, school_id: str, current_user: User) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="You do not have access to this course's attendance")
    return course


def _enrolled_students(db: Session, school_id: str, course_id: str):
    student_ids = [
        row[0]
        for row in db.query(Enrollment.student_id)
        .filter(Enrollment.school_id == school_id, Enrollment.course_id == course_id)
        .distinct()
        .all()
    ]
    if not student_ids:
        return []
    return db.query(User).filter(User.id.in_(student_ids), User.role == UserRole.STUDENT).order_by(User.full_name).all()


@router.post("/attendance/mark")
def mark_attendance(
    payload: AttendanceMarkRequest,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    course = _get_manageable_course(db, payload.course_id, school_id, current_user)

    enrolled_ids = {
        row[0]
        for row in db.query(Enrollment.student_id)
        .filter(Enrollment.school_id == school_id, Enrollment.course_id == course.id)
        .all()
    }

    saved = 0
    for entry in payload.records:
        if entry.student_id not in enrolled_ids:
            # Silently skip -- never trust a student id that isn't actually
            # on this course's roster, rather than 400ing the whole batch
            # over one stale row from a frontend that hasn't refreshed.
            continue
        status_value = entry.status.lower()
        if status_value not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{entry.status}'")

        record = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.course_id == course.id,
                AttendanceRecord.student_id == entry.student_id,
                AttendanceRecord.date == payload.date,
            )
            .first()
        )
        if record:
            record.status = AttendanceStatus(status_value)
            record.notes = entry.notes
            record.marked_by_id = current_user.id
        else:
            record = AttendanceRecord(
                school_id=school_id,
                course_id=course.id,
                student_id=entry.student_id,
                date=payload.date,
                status=AttendanceStatus(status_value),
                notes=entry.notes,
                marked_by_id=current_user.id,
            )
            db.add(record)
        saved += 1

        if status_value == "absent":
            try:
                create_notification(
                    db, school_id=school_id, user_id=entry.student_id,
                    type="attendance_absent", title="Marked absent",
                    message=f"You were marked absent in {course.title} on {payload.date.isoformat()}.",
                    link="/student/attendance",
                )
                parent_ids = {
                    row[0]
                    for row in db.query(ParentStudentLink.parent_id)
                    .filter(ParentStudentLink.school_id == school_id, ParentStudentLink.student_id == entry.student_id)
                    .all()
                }
                for parent_id in parent_ids:
                    create_notification(
                        db, school_id=school_id, user_id=parent_id,
                        type="attendance_absent", title="Attendance update",
                        message=f"Your child was marked absent in {course.title} on {payload.date.isoformat()}.",
                        link="/parent/attendance",
                    )
            except Exception:
                pass

    db.commit()
    return {"saved": saved}


@router.get("/attendance/course/{course_id}", response_model=List[AttendanceRosterEntry])
def get_course_attendance(
    course_id: str,
    date: Optional[date_type] = None,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    course = _get_manageable_course(db, course_id, school_id, current_user)
    target_date = date or date_type.today()

    students = _enrolled_students(db, school_id, course.id)
    if not students:
        return []

    records = {
        r.student_id: r
        for r in db.query(AttendanceRecord)
        .filter(AttendanceRecord.course_id == course.id, AttendanceRecord.date == target_date)
        .all()
    }

    return [
        AttendanceRosterEntry(
            student_id=s.id,
            student_name=s.full_name,
            status=records[s.id].status.value if s.id in records else None,
            notes=records[s.id].notes if s.id in records else None,
        )
        for s in students
    ]


@router.get("/attendance/course/{course_id}/summary", response_model=List[AttendanceSummaryEntry])
def get_course_attendance_summary(
    course_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    course = _get_manageable_course(db, course_id, school_id, current_user)

    students = _enrolled_students(db, school_id, course.id)
    if not students:
        return []

    all_records = db.query(AttendanceRecord).filter(AttendanceRecord.course_id == course.id).all()
    by_student = defaultdict(list)
    for r in all_records:
        by_student[r.student_id].append(r)

    result = []
    for s in students:
        recs = by_student.get(s.id, [])
        total = len(recs)
        present = sum(1 for r in recs if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in recs if r.status == AttendanceStatus.ABSENT)
        late = sum(1 for r in recs if r.status == AttendanceStatus.LATE)
        excused = sum(1 for r in recs if r.status == AttendanceStatus.EXCUSED)
        rate = round(((present + late) / total) * 100, 1) if total else 0.0
        result.append(AttendanceSummaryEntry(
            student_id=s.id,
            student_name=s.full_name,
            present_count=present,
            absent_count=absent,
            late_count=late,
            excused_count=excused,
            total_days=total,
            attendance_rate=rate,
        ))
    return result
