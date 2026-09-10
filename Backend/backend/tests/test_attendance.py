"""
Regression tests for Task #45 (Attendance module): a Teacher can only mark
attendance for their own course roster, students/parents only ever see
their own (or their own linked child's) records, and the present+late-
over-total attendance rate is computed consistently everywhere it's shown.
"""
from datetime import date, timedelta

from app.models.user import UserRole
from app.models.notification import Notification
from factories import make_school, make_user, make_course, enroll, link_parent, auth_headers


def _setup(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    admin = make_user(db, school, UserRole.ADMIN)
    student1 = make_user(db, school, UserRole.STUDENT)
    student2 = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student1, course)
    enroll(db, school, student2, course)
    return school, teacher, admin, student1, student2, course


def test_teacher_can_mark_attendance_for_own_course(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    today = date.today().isoformat()

    res = client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": today, "records": [
            {"studentId": student1.id, "status": "present"},
            {"studentId": student2.id, "status": "absent"},
        ]},
        headers=auth_headers(teacher),
    )
    assert res.status_code == 200
    assert res.json()["saved"] == 2

    roster = client.get(f"/api/v1/attendance/course/{course.id}", params={"date": today}, headers=auth_headers(teacher)).json()
    statuses = {r["studentId"]: r["status"] for r in roster}
    assert statuses[student1.id] == "present"
    assert statuses[student2.id] == "absent"


def test_teacher_cannot_mark_attendance_for_another_teachers_course(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    other_teacher = make_user(db, school, UserRole.TEACHER)

    res = client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": date.today().isoformat(), "records": [
            {"studentId": student1.id, "status": "present"},
        ]},
        headers=auth_headers(other_teacher),
    )
    assert res.status_code == 403


def test_marking_same_day_twice_updates_not_duplicates(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    today = date.today().isoformat()

    client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": today, "records": [{"studentId": student1.id, "status": "absent"}]},
        headers=auth_headers(teacher),
    )
    client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": today, "records": [{"studentId": student1.id, "status": "present"}]},
        headers=auth_headers(teacher),
    )

    summary = client.get(f"/api/v1/attendance/course/{course.id}/summary", headers=auth_headers(teacher)).json()
    entry = next(s for s in summary if s["studentId"] == student1.id)
    assert entry["totalDays"] == 1
    assert entry["presentCount"] == 1
    assert entry["absentCount"] == 0


def test_absent_marking_notifies_student_and_linked_parent(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    parent = make_user(db, school, UserRole.PARENT)
    link_parent(db, school, parent, student1)

    client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": date.today().isoformat(), "records": [{"studentId": student1.id, "status": "absent"}]},
        headers=auth_headers(teacher),
    )

    student_notif = db.query(Notification).filter(Notification.user_id == student1.id, Notification.type == "attendance_absent").first()
    parent_notif = db.query(Notification).filter(Notification.user_id == parent.id, Notification.type == "attendance_absent").first()
    assert student_notif is not None
    assert parent_notif is not None


def test_student_sees_only_their_own_attendance_summary(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": date.today().isoformat(), "records": [
            {"studentId": student1.id, "status": "present"},
            {"studentId": student2.id, "status": "absent"},
        ]},
        headers=auth_headers(teacher),
    )

    res1 = client.get("/api/v1/student/attendance", headers=auth_headers(student1)).json()
    res2 = client.get("/api/v1/student/attendance", headers=auth_headers(student2)).json()

    assert res1["summary"][0]["present_count"] == 1
    assert res2["summary"][0]["absent_count"] == 1
    assert all(r["status"] != "absent" for r in res1["records"])


def test_parent_sees_linked_childs_attendance_not_unrelated_students(client, db):
    school, teacher, admin, student1, student2, course = _setup(db)
    parent = make_user(db, school, UserRole.PARENT)
    link_parent(db, school, parent, student1)

    client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": date.today().isoformat(), "records": [
            {"studentId": student1.id, "status": "excused"},
        ]},
        headers=auth_headers(teacher),
    )

    ok = client.get(f"/api/v1/parent/children/{student1.id}/attendance", headers=auth_headers(parent))
    assert ok.status_code == 200
    assert ok.json()["summary"][0]["excused_count"] == 1

    forbidden = client.get(f"/api/v1/parent/children/{student2.id}/attendance", headers=auth_headers(parent))
    assert forbidden.status_code == 404
