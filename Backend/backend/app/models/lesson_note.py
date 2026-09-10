"""
Task #50: in-lesson notes, highlighting, and bookmarking. One row per
(student, lesson) -- a student's personal notepad, saved highlighted
snippets, and bookmark flag for that lesson. Purely personal data: never
visible to teachers or other students.
"""
import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class LessonNote(Base):
    __tablename__ = "lesson_notes"
    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_lesson_notes_student_lesson"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    notes_text = Column(Text, nullable=True)
    highlights = Column(JSON, nullable=True)  # list of {"text": "..."} snippets the student saved
    is_bookmarked = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("User")
    lesson = relationship("Lesson")
