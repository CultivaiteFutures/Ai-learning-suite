"""
Attendance is taken per course, per calendar day (this app has no separate
"class period"/homeroom concept -- a Course is the unit a teacher owns and
a student is enrolled in, so it's also the natural unit for attendance).
One AttendanceRecord per (course, student, date); marking attendance again
for the same day updates the existing row rather than creating a duplicate
(enforced by the app/api/v1/attendance.py router's upsert logic and backed
by the unique constraint below).
"""
import enum
import uuid
from sqlalchemy import Column, String, Date, Text, ForeignKey, Enum as SQLEnum, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("course_id", "student_id", "date", name="uq_attendance_course_student_date"),
        Index("ix_attendance_course_date", "course_id", "date"),
        Index("ix_attendance_student", "student_id"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(SQLEnum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)
    notes = Column(Text, nullable=True)
    marked_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    school = relationship("School")
    course = relationship("Course")
    student = relationship("User", foreign_keys=[student_id])
    marked_by = relationship("User", foreign_keys=[marked_by_id])
