"""
Task #58: Super Admin support tooling -- a lightweight internal notes log
per school (e.g. "customer called about X, follow up Friday"), visible
only to Super Admin, never to the school's own Admin/Teacher/Student/Parent
users.
"""
import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SchoolSupportNote(Base):
    __tablename__ = "school_support_notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String, nullable=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")
    author = relationship("User")
