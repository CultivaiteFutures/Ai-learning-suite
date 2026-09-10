"""
Reusable grading rubrics (Task #46): a Teacher (or Admin) builds a rubric
once -- a named set of weighted criteria -- and can attach it to any of
their own assignments via Assignment.rubric_id. Grading against a rubric
then means scoring each criterion (stored as JSON on Submission.rubric_scores
-- see app/api/v1/teacher.py's grade_submission) rather than typing one raw
point total, and the total is derived automatically from those scores.

Deliberately not course-scoped: a teacher builds a small library of
rubrics (e.g. "5-Paragraph Essay", "Lab Report") and reuses the same one
across different courses/assignments, rather than rebuilding it every time.
"""
import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")
    created_by = relationship("User")
    criteria = relationship(
        "RubricCriterion",
        back_populates="rubric",
        cascade="all, delete-orphan",
        order_by="RubricCriterion.order",
    )


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rubric_id = Column(String, ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    max_points = Column(Integer, nullable=False, default=10)
    order = Column(Integer, nullable=False, default=0)

    rubric = relationship("Rubric", back_populates="criteria")
