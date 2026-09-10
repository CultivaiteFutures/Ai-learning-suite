import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    """
    One in-app notification for one recipient (user_id). Notifications are
    created exclusively by app/services/notification_service.py's
    create_notification() helper, called from the real event that should
    trigger them (a grade posted, an announcement published, a discussion
    reply, a new submission, a challenge bonus) -- never fabricated data.

    This is in-app only (no email/push/SMS). Most notifications are
    instant-event-triggered (a grade posted, an announcement published,
    etc.); the one exception is "assignment_due_soon", created by a daily
    in-process APScheduler sweep (see app/services/scheduled_jobs.py)
    rather than a live event. link is an optional frontend route path the
    bell icon navigates to when the notification is clicked.
    """
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # recipient
    type = Column(String, nullable=False)  # "grade_posted" | "announcement" | "discussion_reply" | "new_submission" | "challenge_bonus"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String, nullable=True)  # a frontend route path to navigate to when clicked, e.g. "/student/assignments"
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")
    user = relationship("User")
