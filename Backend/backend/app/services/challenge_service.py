"""
Plain importable helper -- NOT a router -- that lets existing grading flows
(teacher.py's grade_submission, student.py's submit_game_score) feed a score
into any matching Challenge without those endpoints knowing anything about
challenge internals.

Challenges are a wrapper/rules layer over the app's existing gradable
content (Assignment/Submission, EvaluationGame/GameResult) -- this module is
the ONLY place that writes to ChallengeParticipant / awards challenge bonus
XP, keeping that logic in one spot no matter which endpoint triggers it.
"""
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.challenges import Challenge, ChallengeParticipant
from app.models.lms import StudentStats
from app.services.notification_service import create_notification


def record_challenge_progress(
    db: Session,
    school_id: str,
    student_id: str,
    target_type: str,
    target_id: str,
    score: int,
) -> None:
    """
    Called after a real grading event (an assignment submission gets graded,
    or a game result gets recorded) with the score that event just produced.

    For every currently-open Challenge in this school that targets exactly
    this (target_type, target_id):
      - upsert the student's ChallengeParticipant row (creating one if the
        student never explicitly joined -- a completed attempt still counts),
        keeping only the higher of the old/new score ("best attempt counts").
      - the FIRST time a score is ever recorded for this student on this
        challenge, award bonus_xp to their StudentStats.xp once, and append
        badge_name to their badges list (if set and not already present),
        then flip bonus_awarded so it can never fire again for this
        participant.

    Never commits partial state: a single db.commit() at the end persists
    every challenge's update together, mirroring the all-or-nothing shape of
    the callers' own existing commit points.
    """
    if not target_type or not target_id:
        return

    now = datetime.now(timezone.utc)

    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.school_id == school_id,
            Challenge.target_type == target_type,
            Challenge.target_id == target_id,
            Challenge.is_active == True,  # noqa: E712
            Challenge.start_date <= now,
            Challenge.end_date >= now,
        )
        .all()
    )

    if not challenges:
        return

    for challenge in challenges:
        participant = (
            db.query(ChallengeParticipant)
            .filter(
                ChallengeParticipant.challenge_id == challenge.id,
                ChallengeParticipant.student_id == student_id,
            )
            .first()
        )

        if participant is None:
            participant = ChallengeParticipant(
                id=str(uuid.uuid4()),
                school_id=school_id,
                challenge_id=challenge.id,
                student_id=student_id,
                joined_at=now,
                score=None,
                completed_at=None,
                bonus_awarded=False,
            )
            db.add(participant)

        is_first_completion = participant.completed_at is None

        if participant.score is None or score > participant.score:
            participant.score = score
        participant.completed_at = now

        if is_first_completion and not participant.bonus_awarded:
            stats = db.query(StudentStats).filter(StudentStats.student_id == student_id).first()
            if stats is None:
                stats = StudentStats(
                    id=str(uuid.uuid4()),
                    school_id=school_id,
                    student_id=student_id,
                    xp=0,
                    streak_days=0,
                    badges=[],
                )
                db.add(stats)

            stats.xp = (stats.xp or 0) + (challenge.bonus_xp or 0)

            if challenge.badge_name:
                badges = list(stats.badges or [])
                if challenge.badge_name not in badges:
                    badges.append(challenge.badge_name)
                stats.badges = badges

            participant.bonus_awarded = True

            try:
                create_notification(
                    db, school_id=school_id, user_id=student_id,
                    type="challenge_bonus", title="Challenge bonus earned!",
                    message=f"You earned a bonus for a challenge \u2014 nice work!",
                    link="/student/challenges",
                )
            except Exception:
                pass

    db.commit()
