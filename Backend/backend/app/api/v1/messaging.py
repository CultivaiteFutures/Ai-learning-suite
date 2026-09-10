"""
Direct 1:1 messaging (Task #44). Deliberately narrow: a Teacher can message
a Student only if that student is enrolled in one of the teacher's own
courses, and can message a Parent only if that parent has a linked child
enrolled in one of the teacher's own courses -- never an open "message any
user in the school" directory. The same rule is checked symmetrically when
a Student or Parent starts the conversation instead, via
_eligible_contacts(), which is the single source of truth for "who can X
message" from X's own point of view regardless of who initiates.

No admin participation and no group threads -- out of scope for this task.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course, CourseTeacher
from app.models.lms import Enrollment, ParentStudentLink
from app.models.messaging import Conversation, Message
from app.services.notification_service import create_notification
from app.schemas.messaging import (
    ContactResponse,
    ConversationResponse,
    StartConversationRequest,
    MessageCreate,
    MessageResponse,
)

router = APIRouter()

MESSAGING_ROLES = [UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]

# Frontend route each role's message inbox lives at, used to build a
# notification link that actually works for whichever role receives it.
_ROLE_MESSAGES_PATH = {
    UserRole.TEACHER: "/teacher/messages",
    UserRole.STUDENT: "/student/messages",
    UserRole.PARENT: "/parent/messages",
}


def _owned_course_ids(db: Session, school_id: str, teacher: User) -> List[str]:
    rows = db.query(Course.id).filter(
        Course.school_id == school_id,
        or_(Course.created_by_id == teacher.id, Course.created_by_id.is_(None)),
    ).all()
    co_taught = db.query(CourseTeacher.course_id).filter(
        CourseTeacher.school_id == school_id, CourseTeacher.teacher_id == teacher.id,
    ).all()
    return list({row[0] for row in rows} | {row[0] for row in co_taught})


def _eligible_contacts(db: Session, school_id: str, current_user: User) -> List[User]:
    """Every user current_user is allowed to start/continue a conversation
    with, from current_user's own point of view."""
    if current_user.role == UserRole.TEACHER:
        course_ids = _owned_course_ids(db, school_id, current_user)
        if not course_ids:
            return []
        student_ids = {
            row[0]
            for row in db.query(Enrollment.student_id)
            .filter(Enrollment.school_id == school_id, Enrollment.course_id.in_(course_ids))
            .distinct()
            .all()
        }
        if not student_ids:
            return []
        parent_ids = {
            row[0]
            for row in db.query(ParentStudentLink.parent_id)
            .filter(ParentStudentLink.school_id == school_id, ParentStudentLink.student_id.in_(student_ids))
            .distinct()
            .all()
        }
        return (
            db.query(User)
            .filter(User.id.in_(student_ids | parent_ids), User.school_id == school_id)
            .order_by(User.full_name)
            .all()
        )

    if current_user.role == UserRole.STUDENT:
        course_ids = {
            row[0]
            for row in db.query(Enrollment.course_id)
            .filter(Enrollment.school_id == school_id, Enrollment.student_id == current_user.id)
            .all()
        }
        if not course_ids:
            return []
        teacher_ids = {
            row[0]
            for row in db.query(Course.created_by_id)
            .filter(Course.id.in_(course_ids), Course.created_by_id.isnot(None))
            .distinct()
            .all()
        }
        if not teacher_ids:
            return []
        return (
            db.query(User)
            .filter(User.id.in_(teacher_ids), User.school_id == school_id, User.role == UserRole.TEACHER)
            .order_by(User.full_name)
            .all()
        )

    if current_user.role == UserRole.PARENT:
        child_ids = {
            row[0]
            for row in db.query(ParentStudentLink.student_id)
            .filter(ParentStudentLink.school_id == school_id, ParentStudentLink.parent_id == current_user.id)
            .all()
        }
        if not child_ids:
            return []
        course_ids = {
            row[0]
            for row in db.query(Enrollment.course_id)
            .filter(Enrollment.school_id == school_id, Enrollment.student_id.in_(child_ids))
            .all()
        }
        if not course_ids:
            return []
        teacher_ids = {
            row[0]
            for row in db.query(Course.created_by_id)
            .filter(Course.id.in_(course_ids), Course.created_by_id.isnot(None))
            .distinct()
            .all()
        }
        if not teacher_ids:
            return []
        return (
            db.query(User)
            .filter(User.id.in_(teacher_ids), User.school_id == school_id, User.role == UserRole.TEACHER)
            .order_by(User.full_name)
            .all()
        )

    return []


def _pair_key(user_id_1: str, user_id_2: str):
    return tuple(sorted([user_id_1, user_id_2]))


def _other_participant(conversation: Conversation, current_user: User) -> User:
    return conversation.user_b if conversation.user_a_id == current_user.id else conversation.user_a


def _to_contact_response(user: User) -> ContactResponse:
    return ContactResponse(id=user.id, name=user.full_name, role=user.role.value.lower(), email=user.email)


@router.get("/messages/contacts", response_model=List[ContactResponse], dependencies=[Depends(require_roles(MESSAGING_ROLES))])
def list_contacts(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    return [_to_contact_response(u) for u in _eligible_contacts(db, school_id, current_user)]


@router.get("/messages/conversations", response_model=List[ConversationResponse], dependencies=[Depends(require_roles(MESSAGING_ROLES))])
def list_conversations(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.school_id == school_id,
            or_(Conversation.user_a_id == current_user.id, Conversation.user_b_id == current_user.id),
        )
        .order_by(func.coalesce(Conversation.last_message_at, Conversation.created_at).desc())
        .all()
    )

    result = []
    for convo in conversations:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == convo.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread = (
            db.query(Message)
            .filter(
                Message.conversation_id == convo.id,
                Message.sender_id != current_user.id,
                Message.is_read.is_(False),
            )
            .count()
        )
        result.append(ConversationResponse(
            id=convo.id,
            other_participant=_to_contact_response(_other_participant(convo, current_user)),
            last_message=last_msg.body if last_msg else None,
            last_message_at=convo.last_message_at,
            unread_count=unread,
            created_at=convo.created_at,
        ))
    return result


@router.post("/messages/conversations", response_model=ConversationResponse, dependencies=[Depends(require_roles(MESSAGING_ROLES))])
def start_conversation(
    payload: StartConversationRequest,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    eligible_ids = {u.id for u in _eligible_contacts(db, school_id, current_user)}
    if payload.recipient_id not in eligible_ids:
        raise HTTPException(status_code=403, detail="You are not able to message this person")

    id_a, id_b = _pair_key(current_user.id, payload.recipient_id)
    convo = (
        db.query(Conversation)
        .filter(Conversation.school_id == school_id, Conversation.user_a_id == id_a, Conversation.user_b_id == id_b)
        .first()
    )
    if not convo:
        convo = Conversation(school_id=school_id, user_a_id=id_a, user_b_id=id_b)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    return ConversationResponse(
        id=convo.id,
        other_participant=_to_contact_response(_other_participant(convo, current_user)),
        last_message=None,
        last_message_at=convo.last_message_at,
        unread_count=0,
        created_at=convo.created_at,
    )


def _get_owned_conversation(db: Session, school_id: str, conversation_id: str, current_user: User) -> Conversation:
    """404 (never 403) when the conversation isn't one of current_user's own
    -- same not-yours-vs-doesn't-exist ambiguity used for notifications."""
    convo = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.school_id == school_id,
            or_(Conversation.user_a_id == current_user.id, Conversation.user_b_id == current_user.id),
        )
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    return convo


@router.get("/messages/conversations/{conversation_id}/messages", response_model=List[MessageResponse], dependencies=[Depends(require_roles(MESSAGING_ROLES))])
def list_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    convo = _get_owned_conversation(db, school_id, conversation_id, current_user)

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == convo.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # Opening the thread is what marks the other person's messages read --
    # mirrors a normal chat app, and keeps unread counts honest without a
    # separate "mark read" round trip from the frontend.
    unread_from_other = [m for m in messages if m.sender_id != current_user.id and not m.is_read]
    for m in unread_from_other:
        m.is_read = True
    if unread_from_other:
        db.commit()

    return [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name if m.sender else "Unknown",
            body=m.body,
            is_read=m.is_read,
            is_mine=(m.sender_id == current_user.id),
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/messages/conversations/{conversation_id}/messages", response_model=MessageResponse, dependencies=[Depends(require_roles(MESSAGING_ROLES))])
def send_message(
    conversation_id: str,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    convo = _get_owned_conversation(db, school_id, conversation_id, current_user)

    now = datetime.now(timezone.utc)
    message = Message(
        conversation_id=convo.id,
        school_id=school_id,
        sender_id=current_user.id,
        body=payload.body.strip(),
        created_at=now,
    )
    db.add(message)
    convo.last_message_at = now

    recipient = _other_participant(convo, current_user)
    try:
        create_notification(
            db, school_id=school_id, user_id=recipient.id,
            type="new_message", title=f"New message from {current_user.full_name}",
            message=message.body[:200],
            link=_ROLE_MESSAGES_PATH.get(recipient.role, "/"),
        )
    except Exception:
        pass

    db.commit()
    db.refresh(message)

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=current_user.full_name,
        body=message.body,
        is_read=message.is_read,
        is_mine=True,
        created_at=message.created_at,
    )
