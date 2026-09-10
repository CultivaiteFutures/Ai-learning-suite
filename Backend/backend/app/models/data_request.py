import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base


class DataDeletionRequest(Base):
    """
    A student's (or their parent's) request to have the student's account
    and data erased. Deliberately a queued request rather than an instant
    self-delete: a student/parent cannot directly destroy an account (they
    may be mistaken, coerced, or it may need a guardian/records check
    first), so a School Admin reviews and fulfills it, which reuses the
    same hard-delete path as DELETE /school-admin/students/{id} and is
    logged in the ActivityLog the same way.
    """
    __tablename__ = "data_deletion_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_name = Column(String, nullable=False)  # snapshot, survives the student row being deleted on fulfillment
    requested_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requested_by_role = Column(String, nullable=True)  # "STUDENT" or "PARENT"
    status = Column(String, default="pending")  # "pending", "fulfilled", "dismissed"
    note = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
