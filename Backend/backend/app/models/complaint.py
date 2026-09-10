"""
School Admin -> Super Admin complaint / support-ticket system. A School
Admin raises a complaint about anything platform-related; the Super Admin
sees every complaint across every school in one queue and can work it
through OPEN -> IN_PROGRESS -> RESOLVED, leaving a resolution note.
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    submitted_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_by_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(ComplaintStatus, native_enum=False), nullable=False, default=ComplaintStatus.OPEN)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    school = relationship("School")
    submitted_by = relationship("User")
