from app.core.security import verify_password
from app.models.user import User, UserRole
from factories import make_school, make_user, auth_headers


def test_admin_can_reset_teacher_password(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    teacher = make_user(db, school, UserRole.TEACHER, password="OldPassword@1")

    res = client.post(f"/api/v1/school-admin/users/{teacher.id}/reset-password", headers=auth_headers(admin))

    assert res.status_code == 200
    new_password = res.json()["generatedPassword"]
    assert new_password

    db.refresh(teacher)
    assert verify_password(new_password, teacher.hashed_password)
    assert not verify_password("OldPassword@1", teacher.hashed_password)


def test_teacher_cannot_reset_another_users_password(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.post(f"/api/v1/school-admin/users/{student.id}/reset-password", headers=auth_headers(teacher))

    assert res.status_code == 403


def test_admin_cannot_reset_password_for_user_in_another_school(client, db):
    school_a = make_school(db, "School A")
    school_b = make_school(db, "School B")
    admin_a = make_user(db, school_a, UserRole.ADMIN)
    teacher_b = make_user(db, school_b, UserRole.TEACHER)

    res = client.post(f"/api/v1/school-admin/users/{teacher_b.id}/reset-password", headers=auth_headers(admin_a))

    assert res.status_code == 404
