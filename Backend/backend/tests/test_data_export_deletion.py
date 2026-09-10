"""
Regression tests for Task #61 (student data export & deletion-on-request):
a student/parent can export the student's own data and request deletion,
neither can reach another student's data, and a School Admin's fulfill
action actually erases the student while dismiss leaves them intact.
"""
import json

from app.models.user import User, UserRole
from app.models.data_request import DataDeletionRequest
from factories import make_school, make_user, make_course, make_assignment, make_enrollment, make_submission, link_parent, auth_headers


def test_student_can_export_own_data_and_only_own(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    other_student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher, title="Algebra")
    make_enrollment(db, school, student, course)
    assignment = make_assignment(db, school, course, title="Homework 1")
    make_submission(db, school, assignment, student, grade_points=88)
    make_submission(db, school, assignment, other_student, grade_points=42)

    res = client.get("/api/v1/student/me/export-data", headers=auth_headers(student))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/json")
    data = json.loads(res.text)
    assert data["profile"]["id"] == student.id
    assert len(data["submissions"]) == 1
    assert data["submissions"][0]["grade_points"] == 88
    assert any(e["course"] == "Algebra" for e in data["enrollments"])


def test_student_deletion_request_is_idempotent_while_pending(client, db):
    school = make_school(db)
    student = make_user(db, school, UserRole.STUDENT)

    res1 = client.post("/api/v1/student/me/request-deletion", headers=auth_headers(student), json={"note": "leaving school"})
    assert res1.status_code == 200
    res2 = client.post("/api/v1/student/me/request-deletion", headers=auth_headers(student), json={})
    assert res2.status_code == 200
    assert res1.json()["id"] == res2.json()["id"]

    count = db.query(DataDeletionRequest).filter(DataDeletionRequest.student_id == student.id).count()
    assert count == 1


def test_parent_can_export_and_request_deletion_for_linked_child_only(client, db):
    school = make_school(db)
    parent = make_user(db, school, UserRole.PARENT)
    child = make_user(db, school, UserRole.STUDENT)
    unrelated_student = make_user(db, school, UserRole.STUDENT)
    link_parent(db, school, parent, child)

    export_res = client.get(f"/api/v1/parent/children/{child.id}/export-data", headers=auth_headers(parent))
    assert export_res.status_code == 200
    assert json.loads(export_res.text)["profile"]["id"] == child.id

    forbidden_res = client.get(f"/api/v1/parent/children/{unrelated_student.id}/export-data", headers=auth_headers(parent))
    assert forbidden_res.status_code == 404

    request_res = client.post(f"/api/v1/parent/children/{child.id}/request-deletion", headers=auth_headers(parent), json={})
    assert request_res.status_code == 200

    forbidden_request_res = client.post(f"/api/v1/parent/children/{unrelated_student.id}/request-deletion", headers=auth_headers(parent), json={})
    assert forbidden_request_res.status_code == 404


def test_admin_fulfill_erases_student_dismiss_does_not(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student_a = make_user(db, school, UserRole.STUDENT)
    student_b = make_user(db, school, UserRole.STUDENT)

    req_a = client.post("/api/v1/student/me/request-deletion", headers=auth_headers(student_a), json={}).json()["id"]
    req_b = client.post("/api/v1/student/me/request-deletion", headers=auth_headers(student_b), json={}).json()["id"]

    list_res = client.get("/api/v1/school-admin/data-requests", headers=auth_headers(admin))
    assert list_res.status_code == 200
    assert {r["id"] for r in list_res.json()} >= {req_a, req_b}

    fulfill_res = client.post(f"/api/v1/school-admin/data-requests/{req_a}/fulfill", headers=auth_headers(admin))
    assert fulfill_res.status_code == 200
    assert db.query(User).filter(User.id == student_a.id).first() is None

    dismiss_res = client.post(f"/api/v1/school-admin/data-requests/{req_b}/dismiss", headers=auth_headers(admin))
    assert dismiss_res.status_code == 200
    assert db.query(User).filter(User.id == student_b.id).first() is not None

    # A resolved request cannot be resolved a second time.
    assert client.post(f"/api/v1/school-admin/data-requests/{req_a}/fulfill", headers=auth_headers(admin)).status_code == 400


def test_admin_can_export_any_student_in_own_school(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.get(f"/api/v1/school-admin/students/{student.id}/export-data", headers=auth_headers(admin))
    assert res.status_code == 200
    assert json.loads(res.text)["profile"]["id"] == student.id
