from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_school_id, get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter()


@router.get("/notifications", response_model=List[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Always scoped to the caller's own school AND their own user id -- a user
    must only ever see their own notifications, never another user's, even
    within the same school.
    """
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.school_id == school_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    NOTE: this literal-path route must stay declared before any
    /notifications/{notification_id} parameterized route in this file, or
    FastAPI will try to match "unread-count" as a notification_id.
    """
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.school_id == school_id,
            Notification.is_read == False,  # noqa: E712
        )
        .count()
    )
    return {"unread_count": count}


@router.patch("/notifications/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    unread = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.school_id == school_id,
            Notification.is_read == False,  # noqa: E712
        )
        .all()
    )
    for notif in unread:
        notif.is_read = True
    db.commit()
    return {"updated": len(unread)}


@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    404 (never 403) when the notification doesn't belong to the caller --
    a user should not be able to distinguish "not yours" from "doesn't
    exist" for another user's notification.
    """
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.school_id == school_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found or access denied")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
