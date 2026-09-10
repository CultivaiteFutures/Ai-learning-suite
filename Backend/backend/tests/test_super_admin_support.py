"""
Regression tests for Task #58 (Super Admin support tooling): the Super
Admin can reset ANY user's password (including a School Admin's own,
which the school-scoped reset-password endpoint deliberately excludes),
and can read/write internal support notes on a school.
"""
from app.models.user import UserRole
from factories import make_school, make_user, auth_headers


def test_super_admin_can_reset_school_admin_password(client, db):
    school = make_school(db)
    super_admin = make_user(db, school, UserRole.SUPER_ADMIN)
    school_admin = make_user(db, school, UserRole.ADMIN)

    res = client.post(f"/api/v1/super-admin/users/{school_admin.id}/reset-password", headers=auth_headers(super_admin))
    assert res.status_code == 200
    body = res.json()
    assert body["generatedPassword"]


def test_school_admin_cannot_reset_another_admins_password(client, db):
    school = make_school(db)
    admin1 = make_user(db, school, UserRole.ADMIN)
    admin2 = make_user(db, school, UserRole.ADMIN)

    res = client.post(f"/api/v1/school-admin/users/{admin2.id}/reset-password", headers=auth_headers(admin1))
    assert res.status_code == 404


def test_super_admin_can_add_and_list_support_notes(client, db):
    school = make_school(db)
    super_admin = make_user(db, school, UserRole.SUPER_ADMIN)

    res = client.post(f"/api/v1/super-admin/schools/{school.id}/support-notes", json={"note": "Customer called about billing."}, headers=auth_headers(super_admin))
    assert res.status_code == 200

    list_res = client.get(f"/api/v1/super-admin/schools/{school.id}/support-notes", headers=auth_headers(super_admin))
    assert list_res.status_code == 200
    notes = list_res.json()
    assert len(notes) == 1
    assert notes[0]["note"] == "Customer called about billing."


def test_non_super_admin_cannot_access_support_tools(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.post(f"/api/v1/super-admin/schools/{school.id}/support-notes", json={"note": "sneaky"}, headers=auth_headers(admin))
    assert res.status_code == 403
