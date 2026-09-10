import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.lms import Enrollment, Grade, StudentStats
from app.models.challenges import Challenge, ChallengeParticipant
from app.services.notification_service import create_notification
from app.schemas.challenges import (
    ChallengeCreate,
    ChallengeQuestion,
    check_answer_key,
    ChallengeResponse,
    ChallengeSubmitRequest,
    ChallengeSubmitResponse,
    ChallengeQuestionResult,
    ChallengeLeaderboardEntry,
    ChallengeLeaderboardResponse,
)

router = APIRouter()

VIEW_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]
# Per the "replace entirely" product decision: School Admin is the ONLY role
# that can author a challenge going forward. Teachers get a view-only look
# (see _scoped_challenge_query) and can no longer create, edit, or delete
# one -- there is deliberately no teacher-facing route below.
CREATE_ROLES = [UserRole.ADMIN]
STUDENT_ONLY = [UserRole.STUDENT]

LEADERBOARD_CAP = 50


def _owned_grade_ids_for_teacher(db: Session, school_id: str, current_user: User) -> List[str]:
    """
    The distinct Grade ids of every student enrolled in a course this
    teacher owns (created_by_id == them, or an orphaned course with no
    creator -- the same ownership rule app/api/v1/teacher.py's
    _owned_course_ids uses for the student/analytics scoping fix). This is
    how a TEACHER's "view only" Challenges list is limited to challenges
    that actually reach one of their own students, instead of every
    challenge in the school.
    """
    owned_course_ids = [
        row[0]
        for row in db.query(Course.id)
        .filter(
            Course.school_id == school_id,
            or_(Course.created_by_id == current_user.id, Course.created_by_id.is_(None)),
        )
        .all()
    ]
    if not owned_course_ids:
        return []

    grade_ids = (
        db.query(User.grade_id)
        .join(Enrollment, Enrollment.student_id == User.id)
        .filter(Enrollment.course_id.in_(owned_course_ids), User.grade_id.isnot(None))
        .distinct()
        .all()
    )
    return [row[0] for row in grade_ids]


def _visible_challenges(db: Session, school_id: str, current_user: User, base_query) -> List[Challenge]:
    """
    Grade-based visibility, applied in Python after the school-scoped query
    runs -- target_grade_ids is a JSON column, and this app also runs on
    SQLite (tests/lightweight deployments) where JSON containment isn't
    queryable the same way as Postgres, so filtering after `.all()` keeps
    this correct on both backends (same tradeoff the rest of this app makes
    for its other JSON columns, e.g. StudentStats.badges).

    ADMIN: sees every challenge in the school (they author all of them).
    TEACHER: sees a challenge only if it targets every grade (empty
    target_grade_ids) or overlaps a grade one of their own students is in.
    STUDENT: sees a challenge only if it targets every grade, or includes
    their own grade_id.
    """
    challenges = base_query.all()

    if current_user.role == UserRole.ADMIN:
        return challenges

    if current_user.role == UserRole.TEACHER:
        teacher_grade_ids = set(_owned_grade_ids_for_teacher(db, school_id, current_user))
        return [
            c for c in challenges
            if not c.target_grade_ids or (teacher_grade_ids & set(c.target_grade_ids))
        ]

    # STUDENT
    student_grade_id = current_user.grade_id
    return [
        c for c in challenges
        if not c.target_grade_ids or (student_grade_id and student_grade_id in c.target_grade_ids)
    ]


def _aware(dt: datetime) -> datetime:
    """
    SQLite (used by tests / any lightweight deployment) does not persist
    timezone info on DateTime(timezone=True) columns -- a value written as
    tz-aware comes back naive on re-read. Postgres (production) does not
    have this problem, but comparing against `now` (always tz-aware) must
    still be safe either way, so naive values are assumed UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _status_for(challenge: Challenge, now: datetime) -> str:
    start = _aware(challenge.start_date)
    end = _aware(challenge.end_date)
    if now < start:
        return "upcoming"
    if now > end:
        return "ended"
    return "active"


def _grade_names(db: Session, school_id: str, grade_ids: List[str]) -> List[str]:
    if not grade_ids:
        return []
    rows = db.query(Grade).filter(Grade.school_id == school_id, Grade.id.in_(grade_ids)).all()
    by_id = {g.id: g.name for g in rows}
    # Preserve the order the admin picked them in, drop any id that no
    # longer resolves to a real grade (e.g. a grade deleted after the fact).
    return [by_id[gid] for gid in grade_ids if gid in by_id]


def _sanitize_question(q: dict) -> dict:
    """Strip the answer key out of one question dict before it's sent to a
    student who hasn't submitted this quiz yet."""
    return {
        "id": q.get("id"),
        "text": q.get("text"),
        "type": q.get("type"),
        "options": q.get("options"),
        "points": q.get("points", 1),
    }


def _to_response(
    db: Session,
    challenge: Challenge,
    current_user: User,
    now: Optional[datetime] = None,
    include_questions: bool = False,
) -> ChallengeResponse:
    now = now or datetime.now(timezone.utc)
    participant_count = (
        db.query(ChallengeParticipant)
        .filter(ChallengeParticipant.challenge_id == challenge.id)
        .count()
    )

    my_participant = None
    if current_user.role == UserRole.STUDENT:
        my_participant = (
            db.query(ChallengeParticipant)
            .filter(
                ChallengeParticipant.challenge_id == challenge.id,
                ChallengeParticipant.student_id == current_user.id,
            )
            .first()
        )
    has_submitted = bool(my_participant and my_participant.completed_at is not None)

    questions_out = None
    if include_questions:
        raw_questions = challenge.questions or []
        if current_user.role in (UserRole.ADMIN, UserRole.TEACHER) or has_submitted:
            questions_out = [ChallengeQuestion(**q) for q in raw_questions]
        else:
            questions_out = [ChallengeQuestion(**_sanitize_question(q)) for q in raw_questions]

    return ChallengeResponse(
        id=challenge.id,
        school_id=challenge.school_id,
        created_by_id=challenge.created_by_id,
        title=challenge.title,
        description=challenge.description,
        subject=challenge.subject,
        target_grade_ids=challenge.target_grade_ids or [],
        target_grade_names=_grade_names(db, challenge.school_id, challenge.target_grade_ids or []),
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        bonus_xp=challenge.bonus_xp,
        badge_name=challenge.badge_name,
        is_active=challenge.is_active,
        created_at=challenge.created_at,
        status=_status_for(challenge, now),
        participant_count=participant_count,
        question_count=len(challenge.questions or []),
        has_submitted=has_submitted,
        my_score=my_participant.score if my_participant else None,
        questions=questions_out,
    )


def _validate_answer_keys(questions: List[ChallengeQuestion]) -> None:
    for q in questions:
        try:
            check_answer_key(q)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


def _validate_grade_ids(db: Session, school_id: str, grade_ids: List[str]) -> None:
    if not grade_ids:
        return
    found = db.query(Grade.id).filter(Grade.school_id == school_id, Grade.id.in_(grade_ids)).all()
    found_ids = {row[0] for row in found}
    missing = [gid for gid in grade_ids if gid not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown grade id(s): {', '.join(missing)}")


@router.post("/challenges", response_model=ChallengeResponse, dependencies=[Depends(require_roles(CREATE_ROLES))])
def create_challenge(
    payload: ChallengeCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """
    School Admin authors a school-wide, grade-scoped quiz -- e.g. "a math
    quiz for grades 7-10" -- by picking the grades it applies to (empty =
    every grade in the school) and writing its multiple-choice / true-false
    questions directly on this request. created_by_id is always the caller,
    never trusted from the client.
    """
    _validate_grade_ids(db, school_id, payload.target_grade_ids)
    _validate_answer_keys(payload.questions)

    questions = [
        {
            "id": q.id or str(uuid.uuid4()),
            "text": q.text.strip(),
            "type": q.type,
            "options": q.options,
            "correctIndex": q.correct_index,
            "correctAnswer": q.correct_answer,
            "points": q.points,
        }
        for q in payload.questions
    ]

    challenge = Challenge(
        school_id=school_id,
        course_id=None,
        created_by_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description,
        subject=payload.subject,
        challenge_type="school",
        target_type=None,
        target_id=None,
        target_grade_ids=payload.target_grade_ids or [],
        questions=questions,
        start_date=payload.start_date,
        end_date=payload.end_date,
        bonus_xp=payload.bonus_xp,
        badge_name=payload.badge_name,
        is_active=True,
    )
    db.add(challenge)

    # Notify every student this challenge actually reaches -- their own
    # grade, or every student in the school when target_grade_ids is empty
    # -- the same instant-event-triggered pattern every other notification
    # in this app uses (see app/services/notification_service.py). Never
    # lets a notification hiccup block the challenge itself from saving.
    try:
        recipients_query = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT)
        if payload.target_grade_ids:
            recipients_query = recipients_query.filter(User.grade_id.in_(payload.target_grade_ids))
        for student in recipients_query.all():
            create_notification(
                db, school_id=school_id, user_id=student.id,
                type="new_challenge", title="New challenge posted",
                message=challenge.title,
                link="/student/challenges",
            )
    except Exception:
        pass

    db.commit()
    db.refresh(challenge)
    return _to_response(db, challenge, current_user, include_questions=True)


@router.put("/challenges/{challenge_id}", response_model=ChallengeResponse, dependencies=[Depends(require_roles(CREATE_ROLES))])
def update_challenge(
    challenge_id: str,
    payload: ChallengeCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """Admin-only edit -- full replace of a challenge's content, same
    validation as create. Any school admin (not just the original creator)
    may edit, matching how Grades/Announcements are shared admin resources
    in this app."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id, Challenge.school_id == school_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found or access denied")

    _validate_grade_ids(db, school_id, payload.target_grade_ids)
    _validate_answer_keys(payload.questions)

    challenge.title = payload.title.strip()
    challenge.description = payload.description
    challenge.subject = payload.subject
    challenge.target_grade_ids = payload.target_grade_ids or []
    challenge.questions = [
        {
            "id": q.id or str(uuid.uuid4()),
            "text": q.text.strip(),
            "type": q.type,
            "options": q.options,
            "correctIndex": q.correct_index,
            "correctAnswer": q.correct_answer,
            "points": q.points,
        }
        for q in payload.questions
    ]
    challenge.start_date = payload.start_date
    challenge.end_date = payload.end_date
    challenge.bonus_xp = payload.bonus_xp
    challenge.badge_name = payload.badge_name

    db.commit()
    db.refresh(challenge)
    return _to_response(db, challenge, current_user, include_questions=True)


@router.get("/challenges", response_model=List[ChallengeResponse], dependencies=[Depends(require_roles(VIEW_ROLES))])
def list_challenges(
    active_only: bool = Query(True, description="When true (default), hide deactivated challenges. Upcoming/active/ended are all still returned -- use the computed `status` field to distinguish them."),
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    query = db.query(Challenge).filter(Challenge.school_id == school_id)
    if active_only:
        query = query.filter(Challenge.is_active == True)  # noqa: E712
    query = query.order_by(Challenge.start_date.desc())

    challenges = _visible_challenges(db, school_id, current_user, query)
    now = datetime.now(timezone.utc)
    return [_to_response(db, c, current_user, now) for c in challenges]


@router.get("/challenges/{challenge_id}", response_model=ChallengeResponse, dependencies=[Depends(require_roles(VIEW_ROLES))])
def get_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    base = db.query(Challenge).filter(Challenge.school_id == school_id, Challenge.id == challenge_id)
    matches = _visible_challenges(db, school_id, current_user, base)
    if not matches:
        raise HTTPException(status_code=404, detail="Challenge not found or access denied")
    return _to_response(db, matches[0], current_user, include_questions=True)


@router.post(
    "/challenges/{challenge_id}/submit",
    response_model=ChallengeSubmitResponse,
    dependencies=[Depends(require_roles(STUDENT_ONLY))],
)
def submit_challenge(
    challenge_id: str,
    payload: ChallengeSubmitRequest,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """
    One-shot auto-graded submission -- a student takes the quiz and turns it
    in exactly once. Creates their ChallengeParticipant row if they don't
    already have one (there is no separate "join" step anymore: submitting
    IS joining), grades every question against the stored answer key, awards
    bonus_xp/badge_name the first time only, and returns a per-question
    breakdown so the student can see what they got right.
    """
    base = db.query(Challenge).filter(Challenge.school_id == school_id, Challenge.id == challenge_id)
    matches = _visible_challenges(db, school_id, current_user, base)
    if not matches:
        raise HTTPException(status_code=404, detail="Challenge not found or access denied")
    challenge = matches[0]

    participant = (
        db.query(ChallengeParticipant)
        .filter(
            ChallengeParticipant.challenge_id == challenge_id,
            ChallengeParticipant.student_id == current_user.id,
        )
        .first()
    )
    if participant and participant.completed_at is not None:
        raise HTTPException(status_code=400, detail="You have already submitted this challenge")

    answers_by_question = {a.question_id: a for a in payload.answers}
    questions = challenge.questions or []

    results: List[ChallengeQuestionResult] = []
    score = 0
    max_score = 0
    correct_count = 0

    for q in questions:
        points_possible = q.get("points", 1)
        max_score += points_possible
        answer = answers_by_question.get(q.get("id"))

        is_correct = False
        if answer:
            if q.get("type") == "mcq":
                is_correct = answer.selected_index is not None and answer.selected_index == q.get("correctIndex")
            elif q.get("type") == "true_false":
                is_correct = answer.selected_answer is not None and answer.selected_answer == q.get("correctAnswer")

        points_earned = points_possible if is_correct else 0
        score += points_earned
        if is_correct:
            correct_count += 1

        results.append(
            ChallengeQuestionResult(
                question_id=q.get("id"),
                correct=is_correct,
                points_earned=points_earned,
                points_possible=points_possible,
                correct_index=q.get("correctIndex"),
                correct_answer=q.get("correctAnswer"),
                selected_index=answer.selected_index if answer else None,
                selected_answer=answer.selected_answer if answer else None,
            )
        )

    now = datetime.now(timezone.utc)
    submitted_answers = [
        {
            "questionId": a.question_id,
            "selectedIndex": a.selected_index,
            "selectedAnswer": a.selected_answer,
        }
        for a in payload.answers
    ]

    if participant is None:
        participant = ChallengeParticipant(
            id=str(uuid.uuid4()),
            school_id=school_id,
            challenge_id=challenge_id,
            student_id=current_user.id,
            joined_at=now,
        )
        db.add(participant)

    participant.score = score
    participant.completed_at = now
    participant.answers = submitted_answers

    bonus_xp_awarded = 0
    if not participant.bonus_awarded:
        stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
        if stats is None:
            stats = StudentStats(
                id=str(uuid.uuid4()),
                school_id=school_id,
                student_id=current_user.id,
                xp=0,
                streak_days=0,
                badges=[],
            )
            db.add(stats)

        stats.xp = (stats.xp or 0) + (challenge.bonus_xp or 0)
        bonus_xp_awarded = challenge.bonus_xp or 0

        if challenge.badge_name:
            badges = list(stats.badges or [])
            if challenge.badge_name not in badges:
                badges.append(challenge.badge_name)
            stats.badges = badges

        participant.bonus_awarded = True

        try:
            create_notification(
                db, school_id=school_id, user_id=current_user.id,
                type="challenge_bonus", title="Challenge completed!",
                message=f"You scored {score}/{max_score} on \"{challenge.title}\" and earned a bonus.",
                link="/student/challenges",
            )
        except Exception:
            pass

    db.commit()

    return ChallengeSubmitResponse(
        score=score,
        max_score=max_score,
        correct_count=correct_count,
        total_questions=len(questions),
        bonus_xp_awarded=bonus_xp_awarded,
        results=results,
    )


@router.get(
    "/challenges/{challenge_id}/leaderboard",
    response_model=ChallengeLeaderboardResponse,
    dependencies=[Depends(require_roles(VIEW_ROLES))],
)
def get_challenge_leaderboard(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    base = db.query(Challenge).filter(Challenge.school_id == school_id, Challenge.id == challenge_id)
    matches = _visible_challenges(db, school_id, current_user, base)
    if not matches:
        raise HTTPException(status_code=404, detail="Challenge not found or access denied")

    rows = (
        db.query(ChallengeParticipant, User)
        .join(User, User.id == ChallengeParticipant.student_id)
        .filter(ChallengeParticipant.challenge_id == challenge_id)
        .all()
    )

    # Highest score first; participants with no recorded score yet sort last.
    ranked = sorted(rows, key=lambda row: (row[0].score is None, -(row[0].score or 0)))

    entries: List[ChallengeLeaderboardEntry] = []
    current_student_entry: Optional[ChallengeLeaderboardEntry] = None

    for idx, (participant, student) in enumerate(ranked, start=1):
        is_current = student.id == current_user.id
        entry = ChallengeLeaderboardEntry(
            rank=idx,
            student_id=student.id,
            full_name=student.full_name,
            score=participant.score,
            completed_at=participant.completed_at,
            is_current_user=is_current,
        )
        if is_current:
            current_student_entry = entry
        if idx <= LEADERBOARD_CAP:
            entries.append(entry)

    # Only surface the requesting student's own entry separately when they
    # fall outside the top-N cut -- if they're already in `entries`, that's
    # their rank.
    trailing_student = None
    if current_user.role == UserRole.STUDENT and current_student_entry and current_student_entry.rank > LEADERBOARD_CAP:
        trailing_student = current_student_entry

    return ChallengeLeaderboardResponse(entries=entries, current_student=trailing_student)


@router.delete("/challenges/{challenge_id}", dependencies=[Depends(require_roles(CREATE_ROLES))])
def delete_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """Admin-only, school-scoped delete -- any admin at this school may
    remove a challenge, matching update_challenge's shared-resource model."""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id, Challenge.school_id == school_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found or access denied")

    db.delete(challenge)
    db.commit()
    return {"message": "Challenge deleted", "id": challenge_id}
