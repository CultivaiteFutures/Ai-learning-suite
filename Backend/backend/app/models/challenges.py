import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Challenge(Base):
    """
    A school-wide, grade-scoped quiz (multiple-choice / true-false),
    authored by School Admin and taken directly by students -- see
    POST /challenges/{id}/submit, which auto-grades against `questions` the
    moment a student turns it in, so there is no manual-grading step.

    target_grade_ids says which grades this challenge is for (e.g. "grades
    7-10"); empty/NULL means every grade in the school. Teachers get a
    view-only look at any challenge that reaches one of their students'
    grades -- they cannot create or edit challenges.

    course_id/target_type/target_id are legacy columns from an earlier
    design where a Challenge wrapped an existing Assignment/EvaluationGame
    instead of carrying its own quiz content. They're kept, unused, only so
    any pre-existing rows still load without a data migration.
    """
    __tablename__ = "challenges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    challenge_type = Column(String, nullable=False, default="class")  # daily|weekly|monthly|subject|class|school
    target_type = Column(String, nullable=True)  # "assignment" | "game" | NULL -- legacy, unused by
    # challenges created after the quiz redesign (kept so old rows still load)
    target_id = Column(String, nullable=True)  # legacy, see target_type
    # Which grades this challenge is for (list of Grade.id strings). NULL or
    # [] means every grade in the school. This is how "a math quiz for
    # grades 7-10" is represented -- School Admin picks the grade rows
    # covering 7 through 10 in the create form.
    target_grade_ids = Column(JSON, nullable=True, default=list)
    # The quiz itself: a JSON list of question dicts, each shaped like
    # {"id": str, "text": str, "type": "mcq"|"true_false",
    #  "options": [str, ...] (mcq only), "correctIndex": int (mcq only),
    #  "correctAnswer": bool (true_false only), "points": int}.
    # Auto-graded -- see POST /challenges/{id}/submit -- so no manual
    # grading step is ever needed for a challenge.
    questions = Column(JSON, nullable=True, default=list)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    bonus_xp = Column(Integer, nullable=False, default=20)
    badge_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")
    course = relationship("Course")
    created_by = relationship("User")
    participants = relationship(
        "ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan"
    )


class ChallengeParticipant(Base):
    """
    One student's entry into one Challenge. score/completed_at track the
    student's BEST recorded attempt against the challenge's target (see
    app/services/challenge_service.py, which only overwrites score upward).
    bonus_awarded guards the one-time bonus_xp/badge grant so re-attempts
    never double-pay.
    """
    __tablename__ = "challenge_participants"
    __table_args__ = (
        UniqueConstraint("challenge_id", "student_id", name="uq_challenge_participant"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(String, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    score = Column(Integer, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    bonus_awarded = Column(Boolean, default=False)
    # The student's submitted answers, list of
    # {"questionId": str, "selectedIndex": int|None, "selectedAnswer": bool|None}
    # -- kept so results can be reviewed after auto-grading.
    answers = Column(JSON, nullable=True, default=list)

    challenge = relationship("Challenge", back_populates="participants")
    student = relationship("User")
