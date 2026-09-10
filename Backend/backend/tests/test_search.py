"""
Regression tests for Task #52 (search across course content): a student
only finds content in courses they're enrolled in, a teacher only in
courses they own/co-teach, and an admin finds everything in the school.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, make_lesson, make_assignment, make_enrollment, auth_headers


def test_student_search_only_returns_enrolled_course_content(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    enrolled_course = make_course(db, school, teacher=teacher, title="Algebra Basics")
    other_course = make_course(db, school, teacher=teacher, title="Advanced Chemistry")
    make_enrollment(db, school, student, enrolled_course)
    make_lesson(db, enrolled_course, title="Quadratic Equations")
    make_lesson(db, other_course, title="Quadratic Reactions")

    res = client.get("/api/v1/student/search?q=Quadratic", headers=auth_headers(student))
    assert res.status_code == 200
    titles = [r["title"] for r in res.json()]
    assert "Quadratic Equations" in titles
    assert "Quadratic Reactions" not in titles


def test_teacher_search_scoped_to_own_courses(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    other_teacher = make_user(db, school, UserRole.TEACHER)
    own_course = make_course(db, school, teacher=teacher, title="Own Course")
    other_course = make_course(db, school, teacher=other_teacher, title="Other Course")
    make_assignment(db, school, own_course, title="Photosynthesis Essay")
    make_assignment(db, school, other_course, title="Photosynthesis Lab")

    res = client.get("/api/v1/teacher/search?q=Photosynthesis", headers=auth_headers(teacher))
    assert res.status_code == 200
    titles = [r["title"] for r in res.json()]
    assert "Photosynthesis Essay" in titles
    assert "Photosynthesis Lab" not in titles


def test_admin_search_returns_everything_in_school(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    teacher = make_user(db, school, UserRole.TEACHER)
    course = make_course(db, school, teacher=teacher, title="Robotics Club")

    res = client.get("/api/v1/school-admin/search?q=Robotics", headers=auth_headers(admin))
    assert res.status_code == 200
    titles = [r["title"] for r in res.json()]
    assert "Robotics Club" in titles


def test_search_requires_minimum_query_length(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.get("/api/v1/school-admin/search?q=a", headers=auth_headers(admin))
    assert res.status_code == 200
    assert res.json() == []
