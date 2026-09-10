"""
Regression tests for Task #49 (formal report card / progress report PDF):
a teacher can generate one for a student enrolled in their own course but
not for a stranger's student, and a school admin can generate one for any
student in the school.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, make_assignment, make_enrollment, make_submission, auth_headers


def test_teacher_can_generate_report_card_for_own_student(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    make_enrollment(db, school, student, course)
    assignment = make_assignment(db, school, course)
    make_submission(db, school, assignment, student, grade_points=85)

    res = client.get(f"/api/v1/teacher/students/{student.id}/report-card", headers=auth_headers(teacher))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"


def test_teacher_cannot_generate_report_card_for_unrelated_student(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    other_teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=other_teacher)
    make_enrollment(db, school, student, course)

    res = client.get(f"/api/v1/teacher/students/{student.id}/report-card", headers=auth_headers(teacher))
    assert res.status_code == 403


def test_admin_can_generate_report_card_for_any_student(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.get(f"/api/v1/school-admin/students/{student.id}/report-card", headers=auth_headers(admin))
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"


def test_report_card_404_for_unknown_student(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.get("/api/v1/school-admin/students/does-not-exist/report-card", headers=auth_headers(admin))
    assert res.status_code == 404
