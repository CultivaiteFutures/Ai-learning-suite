"""
Regression tests for Task #53 (bulk CSV import/export for rostering):
an admin can bulk-import teachers from a CSV file (with proper validation)
and export the current roster back out as CSV.
"""
import io
from app.models.user import UserRole
from factories import make_school, make_user, auth_headers


def _csv_bytes(rows):
    return ("\n".join(rows) + "\n").encode("utf-8")


def test_admin_can_bulk_upload_teachers_csv(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    csv_content = _csv_bytes(["Name,Email", "Jane Smith,jane.smith@example.com", "John Doe,john.doe@example.com"])

    res = client.post(
        "/api/v1/school-admin/teachers/upload-csv",
        files={"file": ("teachers.csv", io.BytesIO(csv_content), "text/csv")},
        headers=auth_headers(admin),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["createdCount"] == 2
    assert len(body["credentials"]) == 2
    assert body["credentials"][0]["email"] == "jane.smith@example.com"


def test_bulk_upload_rejects_duplicate_and_missing_fields(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    make_user(db, school, UserRole.TEACHER, email="existing@example.com")
    csv_content = _csv_bytes(["Name,Email", "Existing Teacher,existing@example.com", ",missing-name@example.com"])

    res = client.post(
        "/api/v1/school-admin/teachers/upload-csv",
        files={"file": ("teachers.csv", io.BytesIO(csv_content), "text/csv")},
        headers=auth_headers(admin),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["createdCount"] == 0
    assert body["invalidCount"] == 2


def test_non_admin_cannot_bulk_upload_teachers(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    csv_content = _csv_bytes(["Name,Email", "New Teacher,new@example.com"])

    res = client.post(
        "/api/v1/school-admin/teachers/upload-csv",
        files={"file": ("teachers.csv", io.BytesIO(csv_content), "text/csv")},
        headers=auth_headers(teacher),
    )
    assert res.status_code == 403


def test_admin_can_export_roster_csv(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    make_user(db, school, UserRole.TEACHER, email="t1@example.com")
    make_user(db, school, UserRole.STUDENT, email="s1@example.com")

    res = client.get("/api/v1/school-admin/roster/export.csv?role=all", headers=auth_headers(admin))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    text = res.content.decode("utf-8")
    assert "t1@example.com" in text
    assert "s1@example.com" in text
    assert text.startswith("Name,Email,Role,Grade,Section,Active")
