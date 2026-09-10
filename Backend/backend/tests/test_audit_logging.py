"""
Regression tests for Task #57 (comprehensive platform-wide audit logging):
login success/failure, account deletions, and school deletion all record
an ActivityLog row, and the Super Admin can read/filter/export them.
"""
from app.models.user import UserRole
from app.models.platform import ActivityLog
from factories import make_school, make_user, auth_headers


def test_successful_login_is_logged(client, db):
    school = make_school(db)
    make_user(db, school, UserRole.TEACHER, email="teacher@example.com", password="Secret@123")

    res = client.post("/api/v1/auth/login", json={"email": "teacher@example.com", "password": "Secret@123"})
    assert res.status_code == 200

    log = db.query(ActivityLog).filter(ActivityLog.action == "LOGIN_SUCCESS").first()
    assert log is not None
    assert log.school_id == school.id


def test_failed_login_is_logged(client, db):
    school = make_school(db)
    make_user(db, school, UserRole.TEACHER, email="teacher2@example.com", password="Secret@123")

    res = client.post("/api/v1/auth/login", json={"email": "teacher2@example.com", "password": "WrongPassword"})
    assert res.status_code == 401

    log = db.query(ActivityLog).filter(ActivityLog.action == "LOGIN_FAILED").first()
    assert log is not None


def test_deleting_a_student_is_logged(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.delete(f"/api/v1/school-admin/students/{student.id}", headers=auth_headers(admin))
    assert res.status_code == 200

    log = db.query(ActivityLog).filter(ActivityLog.action == "STUDENT_DELETED").first()
    assert log is not None
    assert log.school_id == school.id


def test_super_admin_can_filter_activity_logs_by_school(client, db):
    school_a = make_school(db, name="Filter School A")
    school_b = make_school(db, name="Filter School B")
    admin_a = make_user(db, school_a, UserRole.ADMIN)
    admin_b = make_user(db, school_b, UserRole.ADMIN)
    student_a = make_user(db, school_a, UserRole.STUDENT)
    student_b = make_user(db, school_b, UserRole.STUDENT)
    super_admin = make_user(db, school_a, UserRole.SUPER_ADMIN)

    client.delete(f"/api/v1/school-admin/students/{student_a.id}", headers=auth_headers(admin_a))
    client.delete(f"/api/v1/school-admin/students/{student_b.id}", headers=auth_headers(admin_b))

    res = client.get(f"/api/v1/super-admin/activity-logs?school_id={school_a.id}&action=STUDENT_DELETED", headers=auth_headers(super_admin))
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["school_id"] == school_a.id


def test_super_admin_can_export_activity_logs_csv(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student = make_user(db, school, UserRole.STUDENT)
    super_admin = make_user(db, school, UserRole.SUPER_ADMIN)
    client.delete(f"/api/v1/school-admin/students/{student.id}", headers=auth_headers(admin))

    res = client.get("/api/v1/super-admin/activity-logs/export.csv", headers=auth_headers(super_admin))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "STUDENT_DELETED" in res.content.decode("utf-8")
