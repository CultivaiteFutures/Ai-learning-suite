"""
Regression tests for Task #56 (AI usage/cost metering per school): every
instrumented AI endpoint records an AIUsageLog row, and the Super Admin
metering endpoint aggregates them correctly per school.
"""
from app.models.user import UserRole
from app.models.ai_usage import AIUsageLog
from factories import make_school, make_user, auth_headers


def test_tutor_chat_records_usage_log(client, db, monkeypatch):
    monkeypatch.setattr("app.api.v1.ai.ai_service.tutor_chat", lambda **kwargs: "Here's a helpful answer.")
    school = make_school(db)
    student = make_user(db, school, UserRole.STUDENT)

    res = client.post("/api/v1/ai/tutor-chat", json={"question": "What is photosynthesis?"}, headers=auth_headers(student))
    assert res.status_code == 200

    logs = db.query(AIUsageLog).filter(AIUsageLog.school_id == school.id).all()
    assert len(logs) == 1
    assert logs[0].feature == "tutor_chat"
    assert logs[0].estimated_tokens > 0


def test_super_admin_sees_aggregated_usage_across_schools(client, db, monkeypatch):
    monkeypatch.setattr("app.api.v1.ai.ai_service.tutor_chat", lambda **kwargs: "reply text")
    school_a = make_school(db, name="School A")
    school_b = make_school(db, name="School B")
    student_a = make_user(db, school_a, UserRole.STUDENT)
    student_b = make_user(db, school_b, UserRole.STUDENT)
    super_admin = make_user(db, school_a, UserRole.SUPER_ADMIN)

    client.post("/api/v1/ai/tutor-chat", json={"question": "Q1"}, headers=auth_headers(student_a))
    client.post("/api/v1/ai/tutor-chat", json={"question": "Q2"}, headers=auth_headers(student_a))
    client.post("/api/v1/ai/tutor-chat", json={"question": "Q3"}, headers=auth_headers(student_b))

    res = client.get("/api/v1/super-admin/ai-usage", headers=auth_headers(super_admin))
    assert res.status_code == 200
    body = res.json()
    by_school = {e["school_id"]: e for e in body}
    assert by_school[school_a.id]["total_calls"] == 2
    assert by_school[school_b.id]["total_calls"] == 1
    assert by_school[school_a.id]["by_feature"]["tutor_chat"]["calls"] == 2


def test_non_super_admin_cannot_see_ai_usage(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.get("/api/v1/super-admin/ai-usage", headers=auth_headers(admin))
    assert res.status_code == 403
