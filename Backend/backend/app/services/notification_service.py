"""
Plain importable helper -- NOT a router -- that every real event hook
(grade_submission, create_announcement, create_discussion_reply,
submit_assignment, record_challenge_progress) calls to create an in-app
Notification, without those endpoints knowing anything about notification
internals.

create_notification() intentionally does NOT call db.commit(): it only adds
the row to the session, and the caller's own existing db.commit() (already
present at the end of every hooked endpoint) persists it together with the
rest of that request's changes. This mirrors the rest of the codebase's
convention (e.g. ActivityLog rows are added the same way) and avoids
partial-commit bugs.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    school_id: str,
    user_id: str,
    type: str,
    title: str,
    message: Optional[str] = None,
    link: Optional[str] = None,
) -> Notification:
    notif = Notification(
        school_id=school_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    db.add(notif)
    return notif
