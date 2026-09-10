"""
Compiles the full personal-data export for one student -- the "right to
access" companion to the hard-delete already available at
DELETE /school-admin/students/{id} (Task #61's deletion-on-request flow
routes to that same endpoint). Every relation here is looked up by
student.id / student.school_id only; nothing here trusts a client-supplied
filter.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.course import Course
from app.models.lms import Enrollment, Submission, Assignment, ParentStudentLink, StudentStats
from app.models.attendance import AttendanceRecord
from app.models.lesson_note import LessonNote
from app.models.messaging import Message, Conversation
from app.models.notification import Notification
from app.models.ai_usage import AIUsageLog


def _iso(value):
    return value.isoformat() if value else None


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def export_student_data(db: Session, student: User) -> dict:
    course_titles = {
        c.id: c.title for c in db.query(Course).filter(Course.school_id == student.school_id).all()
    }
    assignment_titles = {
        a.id: a.title for a in db.query(Assignment).filter(Assignment.school_id == student.school_id).all()
    }

    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    submissions = db.query(Submission).filter(Submission.student_id == student.id).all()
    attendance = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).all()
    lesson_notes = db.query(LessonNote).filter(LessonNote.student_id == student.id).all()
    notifications = db.query(Notification).filter(Notification.user_id == student.id).all()
    ai_usage = db.query(AIUsageLog).filter(AIUsageLog.user_id == student.id).all()
    stats = db.query(StudentStats).filter(StudentStats.student_id == student.id).first()

    guardian_names = []
    for link in db.query(ParentStudentLink).filter(ParentStudentLink.student_id == student.id).all():
        parent = db.query(User).filter(User.id == link.parent_id).first()
        if parent:
            guardian_names.append({"name": parent.full_name, "email": parent.email})

    conversations = db.query(Conversation).filter(
        (Conversation.user_a_id == student.id) | (Conversation.user_b_id == student.id)
    ).all()
    other_party_by_conversation = {}
    for c in conversations:
        other_id = c.user_b_id if c.user_a_id == student.id else c.user_a_id
        other = db.query(User).filter(User.id == other_id).first()
        other_party_by_conversation[c.id] = other.full_name if other else "Unknown"
    conversation_ids = list(other_party_by_conversation.keys())
    messages = (
        db.query(Message).filter(Message.conversation_id.in_(conversation_ids)).all()
        if conversation_ids else []
    )

    return {
        "exported_at": _iso(datetime.now(timezone.utc)),
        "profile": {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "role": _enum_value(student.role),
            "grade_id": student.grade_id,
            "section": student.section,
            "is_active": student.is_active,
            "created_at": _iso(student.created_at),
        },
        "guardians": guardian_names,
        "enrollments": [
            {
                "course": course_titles.get(e.course_id, "Unknown course"),
                "status": e.status,
                "enrolled_at": _iso(e.enrolled_at),
            }
            for e in enrollments
        ],
        "submissions": [
            {
                "assignment": assignment_titles.get(s.assignment_id, "Unknown assignment"),
                "content": s.content,
                "file_url": s.file_url,
                "grade_points": s.grade_points,
                "feedback": s.feedback,
                "submitted_at": _iso(s.submitted_at),
            }
            for s in submissions
        ],
        "attendance_records": [
            {
                "course": course_titles.get(a.course_id, "Unknown course"),
                "date": a.date.isoformat() if a.date else None,
                "status": _enum_value(a.status),
                "notes": a.notes,
            }
            for a in attendance
        ],
        "lesson_notes": [
            {
                "lesson_id": n.lesson_id,
                "notes_text": n.notes_text,
                "highlights": n.highlights,
                "is_bookmarked": n.is_bookmarked,
                "updated_at": _iso(n.updated_at),
            }
            for n in lesson_notes
        ],
        "messages": [
            {
                "with": other_party_by_conversation.get(m.conversation_id, "Unknown"),
                "direction": "sent" if m.sender_id == student.id else "received",
                "body": m.body,
                "sent_at": _iso(m.created_at),
            }
            for m in messages
        ],
        "notifications": [
            {
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": _iso(n.created_at),
            }
            for n in notifications
        ],
        "ai_usage": [
            {
                "feature": u.feature,
                "provider": u.provider,
                "estimated_tokens": u.estimated_tokens,
                "created_at": _iso(u.created_at),
            }
            for u in ai_usage
        ],
        "gamification_stats": (
            {"xp": stats.xp, "streak_days": stats.streak_days, "badges": stats.badges}
            if stats else None
        ),
    }
