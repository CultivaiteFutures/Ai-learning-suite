"""
Regression tests for extending Announcements/Calendar visibility to PARENT
(app/api/v1/announcements.py, app/api/v1/calendar.py) -- previously PARENT
wasn't in VIEW_ROLES at all, so a parent got a 403 on both.
"""
from datetime import datetime, timezone

from app.models.user import UserRole
from app.models.lms import Announcement, ParentStudentLink
from app.models.calendar import CalendarEvent
from factories import make_school, make_user, make_course, enroll, auth_headers


def _link_parent_to_child(db, school, parent, child):
    link = ParentStudentLink(school_id=school.id, parent_id=parent.id, student_id=child.id)
    db.add(link)
    db.commit()


def test_parent_sees_school_wide_and_own_childs_course_announcement_not_unrelated_course(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    course_child = make_course(db, school, teacher=teacher, title="Child's Course")
    course_other = make_course(db, school, teacher=teacher, title="Unrelated Course")

    child = make_user(db, school, UserRole.STUDENT)
    other_student = make_user(db, school, UserRole.STUDENT)
    enroll(db, school, child, course_child)
    enroll(db, school, other_student, course_other)

    parent = make_user(db, school, UserRole.PARENT)
    _link_parent_to_child(db, school, parent, child)

    school_wide = Announcement(school_id=school.id, course_id=None, author_id=teacher.id, title="School-wide", content="x")
    for_child = Announcement(school_id=school.id, course_id=course_child.id, author_id=teacher.id, title="For child's course", content="x")
    for_other = Announcement(school_id=school.id, course_id=course_other.id, author_id=teacher.id, title="For unrelated course", content="x")
    db.add_all([school_wide, for_child, for_other])
    db.commit()

    res = client.get("/api/v1/announcements", headers=auth_headers(parent))

    assert res.status_code == 200
    titles = {a["title"] for a in res.json()}
    assert titles == {"School-wide", "For child's course"}


def test_parent_sees_school_wide_and_own_childs_course_event_not_unrelated_course(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    course_child = make_course(db, school, teacher=teacher, title="Child's Course 2")
    course_other = make_course(db, school, teacher=teacher, title="Unrelated Course 2")

    child = make_user(db, school, UserRole.STUDENT)
    other_student = make_user(db, school, UserRole.STUDENT)
    enroll(db, school, child, course_child)
    enroll(db, school, other_student, course_other)

    parent = make_user(db, school, UserRole.PARENT)
    _link_parent_to_child(db, school, parent, child)

    now = datetime.now(timezone.utc)
    school_wide = CalendarEvent(school_id=school.id, course_id=None, created_by_id=teacher.id, title="Holiday", event_date=now)
    for_child = CalendarEvent(school_id=school.id, course_id=course_child.id, created_by_id=teacher.id, title="Child's exam", event_date=now)
    for_other = CalendarEvent(school_id=school.id, course_id=course_other.id, created_by_id=teacher.id, title="Unrelated exam", event_date=now)
    db.add_all([school_wide, for_child, for_other])
    db.commit()

    res = client.get("/api/v1/calendar/events", headers=auth_headers(parent))

    assert res.status_code == 200
    titles = {e["title"] for e in res.json()}
    assert titles == {"Holiday", "Child's exam"}
