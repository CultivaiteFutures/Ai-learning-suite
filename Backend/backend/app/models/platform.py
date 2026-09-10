import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, unique=True)
    plan = Column(String, default="Standard") # Starter, Professional, Enterprise
    status = Column(String, default="active") # active, inactive, canceled
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)

    school = relationship("School", back_populates="subscription")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True) # Null for Super Admin system logs
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class PlatformSetting(Base):
    """Singleton row (id is always the literal string "global") holding
    platform-wide configuration controlled by the Super Admin: maintenance
    mode plus general branding/contact settings. More platform-wide
    settings can be added as columns here later without needing a new
    table."""
    __tablename__ = "platform_settings"

    id = Column(String, primary_key=True, default=lambda: "global")
    maintenance_mode = Column(Boolean, nullable=False, default=False, server_default="false")
    maintenance_message = Column(String, nullable=True)
    platform_name = Column(String, nullable=False, default="AI Learning Suite", server_default="AI Learning Suite")
    support_email = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
