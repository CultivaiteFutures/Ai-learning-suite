import uuid
import secrets
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

def generate_join_code():
    return secrets.token_hex(3).upper() # e.g. 'A7B9F2'

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True) # NULL for Golden Source Template
    join_code = Column(String, unique=True, index=True, nullable=True, default=generate_join_code)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    grade_level = Column(String, nullable=True)
    language = Column(String, default="English")
    difficulty = Column(String, default="Medium")
    is_published = Column(Boolean, default=False)
    is_golden_template = Column(Boolean, default=False)
    origin_template_id = Column(String, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.order", lazy="selectin")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    games = relationship("EvaluationGame", back_populates="course", cascade="all, delete-orphan")
    co_teachers = relationship("CourseTeacher", back_populates="course", cascade="all, delete-orphan")


class CourseTeacher(Base):
    """
    Co-teaching (Task #47): a course still has exactly one `created_by_id`
    (the primary owner -- unchanged, still what auto-titling and "my
    courses" defaults key off of), but any number of additional teachers
    can be granted the same manage rights via a row here. Only the primary
    owner or an Admin may add/remove a co-teacher (see
    app/api/v1/teacher.py's co-teacher endpoints); can_manage_course (see
    app/services/course_ownership.py) treats a co-teacher exactly like the
    primary owner for every existing permission check in the app.
    """
    __tablename__ = "course_teachers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="co_teachers")
    teacher = relationship("User")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    publish_at = Column(DateTime(timezone=True), nullable=True) # NULL = always visible; future = hidden from students until then
    prerequisite_module_id = Column(String, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True) # another module in the SAME course that must be completed first

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order", lazy="selectin")
    prerequisite_module = relationship("Module", remote_side=[id])


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id = Column(String, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=30)
    order = Column(Integer, default=0)
    activities = Column(JSON, nullable=True)
    homework = Column(JSON, nullable=True)
    quiz = Column(JSON, nullable=True)

    module = relationship("Module", back_populates="lessons")
    progress_records = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")