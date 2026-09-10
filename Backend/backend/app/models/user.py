import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    PARENT = "PARENT"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    grade_id = Column(String, ForeignKey("grades.id", ondelete="SET NULL"), nullable=True)
    section = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    calendar_sync_token = Column(String, nullable=True, unique=True)  # secret token for the read-only ICS calendar subscription URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School", back_populates="users")
    grade = relationship("Grade", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    stats = relationship("StudentStats", back_populates="student", uselist=False, cascade="all, delete-orphan")

    # A PARENT-role user's linked children (each a STUDENT-role user), and,
    # symmetrically, a STUDENT-role user's linked guardians. Many-to-many via
    # ParentStudentLink so a student can have more than one guardian and a
    # guardian can have more than one child at the school.
    children = relationship(
        "ParentStudentLink",
        foreign_keys="ParentStudentLink.parent_id",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    guardians = relationship(
        "ParentStudentLink",
        foreign_keys="ParentStudentLink.student_id",
        back_populates="student",
        cascade="all, delete-orphan",
    )