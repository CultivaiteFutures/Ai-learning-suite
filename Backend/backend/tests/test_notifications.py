"""
Regression tests for Task #43 (in-app notification triggers): a Challenge
being created notifies exactly the students it targets, and the daily
"assignment due soon" sweep (app/services/scheduled_jobs.py) notifies
enrolled-but-not-yet-submitted students once and never duplicates.
"""
from datetime import datetime, timedelta, timezone

from app.models.user import UserRole
from app.models.lms import Assignment, Submission
from app.models.notification import Notification
from app.services.scheduled_jobs import send_due_soon_reminders
from factories import make_school, make_grade, make_user, make_course, enroll, auth_headers


def _future_window():
    now = datetime.now(timezone.utc)
    return {
        "startDate": (now - timedelta(hours=1)).isoformat(),
        "endDate": (now + timedelta(days=7)).isoformat(),
    }


def _quiz_payload(grade_ids):
    return {
        "title": "Fractions Quiz",
        "description": "Grades 7 fractions check",
        "subject": "Math",
        "targetGradeIds": grade_ids,
        "bonusXp": 20,
        "badgeName": None,
        "questions": [
            {"text": "2+2?", "type": "mcq", "options": ["3", "4", "5"], "correctIndex": 1, "points": 1},
        ],
        **_future_window(),
    }


def test_challenge_creation_notifies_only_targeted_grade(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    grade7 = make_grade(db, school, "Grade 7")
    grade9 = make_grade(db, school, "Grade 9")
    student_in_7 = make_user(db, school, UserRole.STUDENT, grade=grade7)
    student_in_9 = make_user(db, school, UserRole.STUDENT, grade=grade9)

    res = client.post("/api/v1/challenges", json=_quiz_payload([grade7.id]), headers=auth_headers(admin))
    assert res.status_code == 200

    notifs_7 = db.query(Notification).filter(Notification.user_id == student_in_7.id, Notification.type == "new_challenge").all()
    notifs_9 = db.query(Notification).filter(Notification.user_id == student_in_9.id, Notification.type == "new_challenge").all()

    assert len(notifs_7) == 1
    assert notifs_7[0].link == "/student/challenges"
    assert len(notifs_9) == 0


def test_challenge_creation_with_no_target_grades_notifies_every_student(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    grade7 = make_grade(db, school, "Grade 7")
    grade9 = make_grade(db, school, "Grade 9")
    student_in_7 = make_user(db, school, UserRole.STUDENT, grade=grade7)
    student_in_9 = make_user(db, school, UserRole.STUDENT, grade=grade9)

    res = client.post("/api/v1/challenges", json=_quiz_payload([]), headers=auth_headers(admin))
    assert res.status_code == 200

    for student in (student_in_7, student_in_9):
        notifs = db.query(Notification).filter(Notification.user_id == student.id, Notification.type == "new_challenge").all()
        assert len(notifs) == 1


def _make_assignment(db, school, course, hours_until_due):
    assignment = Assignment(
        school_id=school.id,
        course_id=course.id,
        title="Essay Draft",
        due_date=datetime.now(timezone.utc) + timedelta(hours=hours_until_due),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def test_due_soon_reminder_created_for_unsubmitted_enrolled_student(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)
    assignment = _make_assignment(db, school, course, hours_until_due=5)

    created = send_due_soon_reminders()

    assert created == 1
    notif = (
        db.query(Notification)
        .filter(Notification.user_id == student.id, Notification.type == "assignment_due_soon")
        .first()
    )
    assert notif is not None
    assert notif.link == f"/student/assignments?highlight={assignment.id}"


def test_due_soon_reminder_skips_student_who_already_submitted(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)
    assignment = _make_assignment(db, school, course, hours_until_due=5)

    db.add(Submission(school_id=school.id, assignment_id=assignment.id, student_id=student.id, content="done"))
    db.commit()

    created = send_due_soon_reminders()

    assert created == 0
    notif = (
        db.query(Notification)
        .filter(Notification.user_id == student.id, Notification.type == "assignment_due_soon")
        .first()
    )
    assert notif is None


def test_due_soon_reminder_not_sent_for_assignment_outside_24h_window(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)
    _make_assignment(db, school, course, hours_until_due=48)

    created = send_due_soon_reminders()

    assert created == 0


def test_due_soon_reminder_is_not_duplicated_on_second_run(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)
    _make_assignment(db, school, course, hours_until_due=5)

    first_run = send_due_soon_reminders()
    second_run = send_due_soon_reminders()

    assert first_run == 1
    assert second_run == 0
    count = (
        db.query(Notification)
        .filter(Notification.user_id == student.id, Notification.type == "assignment_due_soon")
        .count()
    )
    assert count == 1
