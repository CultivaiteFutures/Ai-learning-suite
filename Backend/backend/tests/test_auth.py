from app.models.user import UserRole
from factories import make_school, make_user, auth_headers


def test_login_success(client, db):
    school = make_school(db)
    user = make_user(db, school, UserRole.TEACHER, email="teach@test.school", password="Correct@123")

    res = client.post("/api/v1/auth/login", json={"email": "teach@test.school", "password": "Correct@123"})

    assert res.status_code == 200
    body = res.json()
    assert body["accessToken"] or body["access_token"]
    assert body["user"]["email"] == "teach@test.school"
    assert body["user"]["role"] == "teacher"


def test_login_wrong_password_rejected(client, db):
    school = make_school(db)
    make_user(db, school, UserRole.TEACHER, email="teach2@test.school", password="Correct@123")

    res = client.post("/api/v1/auth/login", json={"email": "teach2@test.school", "password": "wrong"})

    assert res.status_code == 401


def test_login_inactive_user_rejected(client, db):
    school = make_school(db)
    user = make_user(db, school, UserRole.TEACHER, email="teach3@test.school", password="Correct@123")
    user.is_active = False
    db.commit()

    res = client.post("/api/v1/auth/login", json={"email": "teach3@test.school", "password": "Correct@123"})

    assert res.status_code == 400


def test_unauthenticated_request_rejected(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_student_cannot_hit_admin_only_route(client, db):
    """RBAC check: a student calling an ADMIN-only endpoint must be refused,
    regardless of which school they belong to."""
    school = make_school(db)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.post(
        "/api/v1/school-admin/grades",
        json={"name": "Grade 9"},
        headers=auth_headers(student),
    )

    assert res.status_code == 403


def test_login_is_rate_limited(client, db):
    """11 rapid attempts from the same client must trip the 10/minute cap
    on the login route (app/api/v1/auth.py) with a 429."""
    school = make_school(db)
    make_user(db, school, UserRole.TEACHER, email="rl@test.school", password="Correct@123")

    statuses = [
        client.post("/api/v1/auth/login", json={"email": "rl@test.school", "password": "wrong"}).status_code
        for _ in range(11)
    ]

    assert 429 in statuses
