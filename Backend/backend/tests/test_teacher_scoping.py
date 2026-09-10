"""
Regression tests for the teacher/course data-scoping fix made this session
(app/api/v1/teacher.py's _owned_course_ids): before the fix, GET
/teacher/students and GET /teacher/courses/{id}/students ignored course
ownership entirely and leaked every student in the school to every teacher.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, enroll, auth_headers


def test_teacher_only_sees_own_students(client, db):
    school = make_school(db)
    teacher_a = make_user(db, school, UserRole.TEACHER, email="a@test.school")
    teacher_b = make_user(db, school, UserRole.TEACHER, email="b@test.school")

    course_a = make_course(db, school, teacher=teacher_a, title="Course A")
    course_b = make_course(db, school, teacher=teacher_b, title="Course B")

    student_a = make_user(db, school, UserRole.STUDENT, email="student-a@test.school")
    student_b = make_user(db, school, UserRole.STUDENT, email="student-b@test.school")
    enroll(db, school, student_a, course_a)
    enroll(db, school, student_b, course_b)

    res = client.get("/api/v1/teacher/students", headers=auth_headers(teacher_a))

    assert res.status_code == 200
    emails = {row["email"] for row in res.json()}
    assert "student-a@test.school" in emails
    assert "student-b@test.school" not in emails


def test_teacher_cannot_view_another_teachers_course_roster(client, db):
    school = make_school(db)
    teacher_a = make_user(db, school, UserRole.TEACHER, email="a2@test.school")
    teacher_b = make_user(db, school, UserRole.TEACHER, email="b2@test.school")
    course_b = make_course(db, school, teacher=teacher_b, title="Course B2")

    res = client.get(f"/api/v1/teacher/courses/{course_b.id}/students", headers=auth_headers(teacher_a))

    assert res.status_code == 403


def test_admin_sees_every_student_in_school(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER, email="c@test.school")
    admin = make_user(db, school, UserRole.ADMIN, email="admin@test.school")
    course = make_course(db, school, teacher=teacher, title="Course C")
    student = make_user(db, school, UserRole.STUDENT, email="student-c@test.school")
    enroll(db, school, student, course)

    res = client.get("/api/v1/teacher/students", headers=auth_headers(admin))

    assert res.status_code == 200
    emails = {row["email"] for row in res.json()}
    assert "student-c@test.school" in emails
