"""
Regression tests for Task #47 (co-teaching / shared course ownership): a
co-teacher gets the exact same manage rights as the primary owner
(can create assignments, take attendance, etc.), only the primary owner or
Admin can add/remove a co-teacher, and a co-teacher can never grant
themselves the ability to add someone else.
"""
from datetime import date

from app.models.user import UserRole
from app.models.notification import Notification
from factories import make_school, make_user, make_course, enroll, auth_headers


def test_owner_can_add_co_teacher_and_notifies_them(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    co_teacher = make_user(db, school, UserRole.TEACHER, email="co@test.school")
    course = make_course(db, school, teacher=owner)

    res = client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "co@test.school"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    assert res.json()["teacherId"] == co_teacher.id

    notif = db.query(Notification).filter(Notification.user_id == co_teacher.id, Notification.type == "co_teacher_added").first()
    assert notif is not None

    listing = client.get(f"/api/v1/teacher/courses/{course.id}/co-teachers", headers=auth_headers(owner)).json()
    assert len(listing) == 1
    assert listing[0]["teacherId"] == co_teacher.id


def test_non_owner_teacher_cannot_add_co_teacher(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    outsider = make_user(db, school, UserRole.TEACHER)
    course = make_course(db, school, teacher=owner)

    res = client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "someone@test.school"},
        headers=auth_headers(outsider),
    )
    assert res.status_code == 403


def test_co_teacher_gains_same_manage_rights_as_owner(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    co_teacher = make_user(db, school, UserRole.TEACHER, email="co2@test.school")
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=owner)
    enroll(db, school, student, course)

    client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "co2@test.school"},
        headers=auth_headers(owner),
    )

    # Co-teacher can now create an assignment on the shared course...
    assign_res = client.post(
        "/api/v1/teacher/assignments",
        json={"courseId": course.id, "title": "Shared Homework"},
        headers=auth_headers(co_teacher),
    )
    assert assign_res.status_code == 200

    # ...and take attendance on it too.
    attendance_res = client.post(
        "/api/v1/attendance/mark",
        json={"courseId": course.id, "date": date.today().isoformat(), "records": [{"studentId": student.id, "status": "present"}]},
        headers=auth_headers(co_teacher),
    )
    assert attendance_res.status_code == 200


def test_co_teacher_cannot_add_another_co_teacher(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    co_teacher = make_user(db, school, UserRole.TEACHER, email="co3@test.school")
    third_teacher = make_user(db, school, UserRole.TEACHER, email="third@test.school")
    course = make_course(db, school, teacher=owner)

    client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "co3@test.school"},
        headers=auth_headers(owner),
    )

    res = client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "third@test.school"},
        headers=auth_headers(co_teacher),
    )
    assert res.status_code == 403


def test_owner_can_remove_co_teacher_revoking_access(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    co_teacher = make_user(db, school, UserRole.TEACHER, email="co4@test.school")
    course = make_course(db, school, teacher=owner)

    client.post(
        f"/api/v1/teacher/courses/{course.id}/co-teachers",
        json={"email": "co4@test.school"},
        headers=auth_headers(owner),
    )
    del_res = client.delete(f"/api/v1/teacher/courses/{course.id}/co-teachers/{co_teacher.id}", headers=auth_headers(owner))
    assert del_res.status_code == 200

    assign_res = client.post(
        "/api/v1/teacher/assignments",
        json={"courseId": course.id, "title": "Should Fail"},
        headers=auth_headers(co_teacher),
    )
    assert assign_res.status_code == 403


def test_unrelated_teacher_still_cannot_manage_course(client, db):
    school = make_school(db)
    owner = make_user(db, school, UserRole.TEACHER)
    unrelated = make_user(db, school, UserRole.TEACHER)
    course = make_course(db, school, teacher=owner)

    res = client.post(
        "/api/v1/teacher/assignments",
        json={"courseId": course.id, "title": "Should Fail"},
        headers=auth_headers(unrelated),
    )
    assert res.status_code == 403
