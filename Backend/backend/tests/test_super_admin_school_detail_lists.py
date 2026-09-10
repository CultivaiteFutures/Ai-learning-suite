"""
Regression test for the Super Admin School Details page bug: the Teachers,
Students, and Courses tabs were hardcoded to an empty list on the frontend
(no backend route even existed to feed them, since a Super Admin has no
school_id of their own on their token). These three routes take the school
id from the URL instead.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, auth_headers


def test_super_admin_can_list_a_specific_schools_teachers_students_courses(client, db):
    school = make_school(db)
    other_school = make_school(db)
    super_admin = make_user(db, None, UserRole.SUPER_ADMIN)

    teacher = make_user(db, school, UserRole.TEACHER, email="t@school.edu")
    student = make_user(db, school, UserRole.STUDENT, email="s@school.edu")
    make_user(db, other_school, UserRole.TEACHER, email="other-teacher@other.edu")
    course = make_course(db, school, teacher=teacher, title="Intro to Biology")
    make_course(db, other_school, title="Unrelated Course")

    t_res = client.get(f"/api/v1/super-admin/schools/{school.id}/teachers", headers=auth_headers(super_admin))
    assert t_res.status_code == 200
    t_emails = [t["email"] for t in t_res.json()]
    assert t_emails == ["t@school.edu"]

    s_res = client.get(f"/api/v1/super-admin/schools/{school.id}/students", headers=auth_headers(super_admin))
    assert s_res.status_code == 200
    assert [s["email"] for s in s_res.json()] == ["s@school.edu"]

    c_res = client.get(f"/api/v1/super-admin/schools/{school.id}/courses", headers=auth_headers(super_admin))
    assert c_res.status_code == 200
    titles = [c["title"] for c in c_res.json()]
    assert titles == ["Intro to Biology"]


def test_unknown_school_id_returns_404(client, db):
    super_admin = make_user(db, None, UserRole.SUPER_ADMIN)
    res = client.get("/api/v1/super-admin/schools/not-a-real-id/teachers", headers=auth_headers(super_admin))
    assert res.status_code == 404


def test_non_super_admin_cannot_call_these_routes(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    res = client.get(f"/api/v1/super-admin/schools/{school.id}/teachers", headers=auth_headers(admin))
    assert res.status_code == 403
