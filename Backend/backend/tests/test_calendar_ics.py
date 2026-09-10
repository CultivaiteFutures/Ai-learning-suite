"""
Regression tests for Task #59 (Calendar ICS export/sync): a downloadable
.ics snapshot scoped the same way as the existing calendar list endpoint,
plus a per-user secret-token subscription URL that calendar apps can poll
without a Bearer header.
"""
from datetime import datetime, timezone, timedelta

from app.models.user import UserRole
from app.models.calendar import CalendarEvent
from factories import make_school, make_user, make_course, make_assignment, make_enrollment, auth_headers


def _make_event(db, school, title, course=None, event_type="event"):
    event = CalendarEvent(
        school_id=school.id,
        course_id=course.id if course else None,
        title=title,
        event_date=datetime.now(timezone.utc) + timedelta(days=1),
        event_type=event_type,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def test_export_ics_scoped_to_student_enrolled_courses(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    enrolled_course = make_course(db, school, teacher=teacher, title="Enrolled Course")
    other_course = make_course(db, school, teacher=teacher, title="Other Course")
    make_enrollment(db, school, student, enrolled_course)

    _make_event(db, school, "School-Wide Holiday")
    _make_event(db, school, "Enrolled Course Exam", course=enrolled_course)
    _make_event(db, school, "Other Course Exam", course=other_course)

    assignment = make_assignment(db, school, enrolled_course, title="Fractions Homework")
    assignment.due_date = datetime.now(timezone.utc) + timedelta(days=2)
    other_assignment = make_assignment(db, school, other_course, title="Unrelated Homework")
    other_assignment.due_date = datetime.now(timezone.utc) + timedelta(days=2)
    db.commit()

    res = client.get("/api/v1/calendar/export.ics", headers=auth_headers(student))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/calendar")
    body = res.text
    assert "BEGIN:VCALENDAR" in body and "END:VCALENDAR" in body
    assert "SUMMARY:School-Wide Holiday" in body
    assert "SUMMARY:Enrolled Course Exam" in body
    assert "Due: Fractions Homework" in body
    assert "Other Course Exam" not in body
    assert "Unrelated Homework" not in body


def test_sync_token_issued_and_public_ics_matches_scope(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher, title="My Course")
    make_enrollment(db, school, student, course)
    _make_event(db, school, "Public Sync Event", course=course)

    res = client.get("/api/v1/calendar/sync-token", headers=auth_headers(student))
    assert res.status_code == 200
    token = res.json()["token"]
    assert token

    # Same token returned on a second call rather than regenerated.
    res2 = client.get("/api/v1/calendar/sync-token", headers=auth_headers(student))
    assert res2.json()["token"] == token

    # No Authorization header at all -- the token alone is the credential.
    public_res = client.get(f"/api/v1/calendar/sync/{token}.ics")
    assert public_res.status_code == 200
    assert "SUMMARY:Public Sync Event" in public_res.text


def test_regenerating_sync_token_invalidates_the_old_one(client, db):
    school = make_school(db)
    student = make_user(db, school, UserRole.STUDENT)

    old_token = client.get("/api/v1/calendar/sync-token", headers=auth_headers(student)).json()["token"]
    new_token = client.post("/api/v1/calendar/sync-token/regenerate", headers=auth_headers(student)).json()["token"]
    assert new_token != old_token

    assert client.get(f"/api/v1/calendar/sync/{old_token}.ics").status_code == 404
    assert client.get(f"/api/v1/calendar/sync/{new_token}.ics").status_code == 200


def test_unknown_sync_token_returns_404(client, db):
    res = client.get("/api/v1/calendar/sync/not-a-real-token.ics")
    assert res.status_code == 404
