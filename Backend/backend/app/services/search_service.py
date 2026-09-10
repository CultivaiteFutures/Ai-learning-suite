"""
Task #52: search across course content (courses, lessons, assignments).
One shared implementation used by all three roles -- the only difference
between them is which course ids they're allowed to search within:
None means "every course in the school" (Admin), a concrete list scopes
the search to just those courses (Teacher's own/co-taught courses, or a
Student's enrolled courses).
"""
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.course import Course, Module, Lesson
from app.models.lms import Assignment

MIN_QUERY_LENGTH = 2
MAX_RESULTS_PER_TYPE = 25


def _snippet(text: Optional[str], query: str, radius: int = 90) -> str:
    if not text:
        return ""
    lower_text = text.lower()
    lower_query = query.lower()
    idx = lower_text.find(lower_query)
    if idx == -1:
        return text[: radius * 2].strip()
    start = max(0, idx - radius)
    end = min(len(text), idx + len(query) + radius)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(text) else ""
    return f"{prefix}{text[start:end].strip()}{suffix}"


def search_course_content(db: Session, school_id: str, course_ids: Optional[List[str]], query: str) -> List[dict]:
    query = query.strip()
    if len(query) < MIN_QUERY_LENGTH:
        return []
    like = f"%{query}%"
    results: List[dict] = []

    course_q = db.query(Course).filter(Course.school_id == school_id)
    if course_ids is not None:
        if not course_ids:
            return []
        course_q = course_q.filter(Course.id.in_(course_ids))
    for c in course_q.filter(or_(Course.title.ilike(like), Course.description.ilike(like))).limit(MAX_RESULTS_PER_TYPE).all():
        results.append({
            "type": "course", "id": c.id, "title": c.title,
            "course_id": c.id, "course_name": c.title,
            "snippet": _snippet(c.description, query),
        })

    lesson_q = (
        db.query(Lesson)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .filter(Course.school_id == school_id)
    )
    if course_ids is not None:
        if not course_ids:
            return results
        lesson_q = lesson_q.filter(Course.id.in_(course_ids))
    for l in lesson_q.filter(or_(Lesson.title.ilike(like), Lesson.content.ilike(like), Lesson.summary.ilike(like))).limit(MAX_RESULTS_PER_TYPE).all():
        results.append({
            "type": "lesson", "id": l.id, "title": l.title,
            "course_id": l.module.course_id, "course_name": l.module.course.title,
            "snippet": _snippet(l.content or l.summary, query),
        })

    assignment_q = db.query(Assignment).join(Course, Course.id == Assignment.course_id).filter(Course.school_id == school_id)
    if course_ids is not None:
        if not course_ids:
            return results
        assignment_q = assignment_q.filter(Course.id.in_(course_ids))
    for a in assignment_q.filter(or_(Assignment.title.ilike(like), Assignment.description.ilike(like))).limit(MAX_RESULTS_PER_TYPE).all():
        course = db.query(Course).filter(Course.id == a.course_id).first()
        results.append({
            "type": "assignment", "id": a.id, "title": a.title,
            "course_id": a.course_id, "course_name": course.title if course else "",
            "snippet": _snippet(a.description, query),
        })

    return results
