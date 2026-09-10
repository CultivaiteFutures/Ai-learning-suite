import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Grade(Base):
    __tablename__ = "grades"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)

    school = relationship("School", back_populates="grades")
    students = relationship("User", back_populates="grade")


class ParentStudentLink(Base):
    """Many-to-many guardian<->student link. A student can have more than one
    guardian on file (e.g. both parents), and a guardian can have more than
    one child enrolled at the same school -- a single FK on User in either
    direction couldn't represent that, so this is a proper join table."""
    __tablename__ = "parent_student_links"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("User", foreign_keys=[parent_id], back_populates="children")
    student = relationship("User", foreign_keys=[student_id], back_populates="guardians")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="active")
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    lesson = relationship("Lesson", back_populates="progress_records")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    max_points = Column(Integer, default=100)
    answer_key = Column(Text, nullable=True)
    target_type = Column(String, default="all") # "all", "grade", "section"
    target_grade = Column(String, nullable=True)
    target_section = Column(String, nullable=True)
    type = Column(String, default="Quiz") # "Quiz", "Homework", "Project", "Gamified Match"
    config = Column(JSON, nullable=True) # Used for gamified match pairs or interactive configs
    rubric_id = Column(String, ForeignKey("rubrics.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    rubric = relationship("Rubric")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    assignment_id = Column(String, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    grade_points = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    rubric_scores = Column(JSON, nullable=True)  # [{criterion_id, points_awarded, comment}], set only when graded against Assignment.rubric_id
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")


class StudentStats(Base):
    __tablename__ = "student_stats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    badges = Column(JSON, default=list)

    student = relationship("User", back_populates="stats")


class EvaluationGame(Base):
    __tablename__ = "evaluation_games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    # Supported game_type values (validated server-side in app/api/v1/games.py, not enforced by a DB constraint):
    #   "quiz_match" -- config.questions = [{question, options: [...], correct_index}]
    #   "trivia"     -- config.questions = [{question, options: [...], correct_index}] (same shape as quiz_match)
    #   "flashcard"  -- config.cards = [{front, back}]
    #   "memory"     -- config.pairs = [{term, match}] (min 4) -- flip-card pair-matching game
    #   "matching"   -- config.pairs = [{left, right}] (min 4) -- click/drag-to-match exercise
    #   "puzzle"     -- config.words = [str, ...] (min 4) + optional config.puzzle_type ("word_scramble" | "word_search")
    game_type = Column(String, default="quiz_match") # quiz_match, trivia, flashcard, memory, matching, puzzle
    config = Column(JSON, nullable=True)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="games")
    results = relationship("GameResult", back_populates="game", cascade="all, delete-orphan")


class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String, ForeignKey("evaluation_games.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    game = relationship("EvaluationGame", back_populates="results")


class Announcement(Base):
    """
    School-wide OR course-scoped notice board post.
    course_id NULL => visible to the whole school; set => scoped to that one course.
    """
    __tablename__ = "announcements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course")
    author = relationship("User")

    @property
    def author_name(self):
        return self.author.full_name if self.author else None


class Discussion(Base):
    """
    Course-scoped Q&A thread ("doubt") started by a student or teacher,
    optionally tied to one specific lesson.
    """
    __tablename__ = "discussions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course")
    lesson = relationship("Lesson")
    author = relationship("User")
    replies = relationship("DiscussionReply", back_populates="discussion", cascade="all, delete-orphan", order_by="DiscussionReply.created_at")

    @property
    def author_name(self):
        return self.author.full_name if self.author else None


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    discussion_id = Column(String, ForeignKey("discussions.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    discussion = relationship("Discussion", back_populates="replies")
    author = relationship("User")

    @property
    def author_name(self):
        return self.author.full_name if self.author else None
