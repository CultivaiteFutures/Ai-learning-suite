"""
The one background job this app runs: a daily sweep that sends "due soon"
notifications for assignments due in the next 24 hours to students who
haven't submitted yet.

This app has no external job scheduler (no Celery, no cron infra) and no
email/push delivery -- see app/models/notification.py's docstring -- so
this is deliberately the smallest possible version of that: an in-process
APScheduler BackgroundScheduler thread, started once from app.main's
startup event, writing plain in-app Notification rows through the same
create_notification() helper every other event-triggered notification uses.
If this app ever runs multi-instance, this job would need to move to a
single external worker instead of running once per instance -- fine for
today's single-instance deployment (see app/main.py's uploads-dir comment
for the same caveat elsewhere in this codebase).
"""
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.lms import Assignment, Enrollment, Submission
from app.models.notification import Notification
from app.services.notification_service import create_notification


def send_due_soon_reminders() -> int:
    """Returns the number of reminders actually created (0 if none were due
    or all eligible students already have one) -- useful for a log line and
    for tests to assert on without needing to query Notification directly."""
    db = SessionLocal()
    created = 0
    try:
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(hours=24)

        due_soon = (
            db.query(Assignment)
            .filter(Assignment.due_date.isnot(None), Assignment.due_date >= now, Assignment.due_date <= window_end)
            .all()
        )

        for assignment in due_soon:
            enrolled_student_ids = {
                e.student_id
                for e in db.query(Enrollment).filter(Enrollment.course_id == assignment.course_id).all()
            }
            if not enrolled_student_ids:
                continue

            already_submitted = {
                s.student_id
                for s in db.query(Submission).filter(Submission.assignment_id == assignment.id).all()
            }

            link = f"/student/assignments?highlight={assignment.id}"

            for student_id in enrolled_student_ids - already_submitted:
                # Dedupe on (user, type, link) so re-running this job (a
                # server restart, or the interval firing again) never sends
                # the same reminder for the same assignment twice.
                exists = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == student_id,
                        Notification.type == "assignment_due_soon",
                        Notification.link == link,
                    )
                    .first()
                )
                if exists:
                    continue

                student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
                if not student:
                    continue

                create_notification(
                    db, school_id=assignment.school_id, user_id=student_id,
                    type="assignment_due_soon", title="Assignment due soon",
                    message=f"\"{assignment.title}\" is due within 24 hours.",
                    link=link,
                )
                created += 1

        db.commit()
        return created
    finally:
        db.close()


def start_scheduler():
    """Called once from app.main's startup event. A no-op if it's somehow
    called twice (e.g. a reload) -- BackgroundScheduler.start() is idempotent
    against a scheduler already running."""
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(send_due_soon_reminders, "interval", hours=24, id="due_soon_reminders", replace_existing=True)
    scheduler.start()
    return scheduler
