"""
Shared course-ownership check used across teacher-facing routers.

`can_manage_course` now needs a db session (Task #47, co-teaching): a
TEACHER manages a course either as its `created_by_id` (the primary
owner, set once at course-creation time), an orphaned course with no
recorded creator, or a co-teacher explicitly granted the same rights via
a CourseTeacher row (see app/models/course.py). `course.school_id` is
irrelevant here: every caller already enforces school/tenant scoping via
`get_current_school_id` BEFORE this check ever runs, so by the time
`can_manage_course` is called the course is already known to belong to the
caller's own school.
"""

from sqlalchemy.orm import Session
from app.models.user import UserRole
from app.models.course import CourseTeacher


def can_manage_course(db: Session, course, current_user) -> bool:
    """
    True if current_user may create/edit/delete content on `course`.

    - ADMIN always can.
    - TEACHER can if they created the course, OR the course has no
      recorded creator (created_by_id IS NULL -- an orphaned pre-existing
      course, treated as manageable by any teacher in the school per
      product decision, so nothing existing becomes silently un-editable
      by anyone), OR they've been added as a co-teacher on this course.
    - Anyone else (e.g. STUDENT) cannot.
    """
    if current_user.role == UserRole.ADMIN:
        return True

    if current_user.role == UserRole.TEACHER:
        if course.created_by_id is None:
            return True
        if course.created_by_id == current_user.id:
            return True
        return (
            db.query(CourseTeacher)
            .filter(CourseTeacher.course_id == course.id, CourseTeacher.teacher_id == current_user.id)
            .first()
            is not None
        )

    return False
