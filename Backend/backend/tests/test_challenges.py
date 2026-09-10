"""
Regression tests for this session's Challenges redesign (app/api/v1/challenges.py):
Admin-only authoring of a grade-scoped quiz, grade-based visibility, and
auto-grading on submit with no manual grading step and no answer-key leak.
"""
from datetime import datetime, timedelta, timezone

from app.models.user import UserRole
from factories import make_school, make_grade, make_user, auth_headers


def _future_window():
    now = datetime.now(timezone.utc)
    return {
        "startDate": (now - timedelta(hours=1)).isoformat(),
        "endDate": (now + timedelta(days=7)).isoformat(),
    }


def _quiz_payload(grade_ids):
    return {
        "title": "Fractions Quiz",
        "description": "Grades 7 fractions check",
        "subject": "Math",
        "targetGradeIds": grade_ids,
        "bonusXp": 20,
        "badgeName": None,
        "questions": [
            {"text": "2+2?", "type": "mcq", "options": ["3", "4", "5"], "correctIndex": 1, "points": 1},
            {"text": "The sky is blue.", "type": "true_false", "correctAnswer": True, "points": 1},
        ],
        **_future_window(),
    }


def test_teacher_cannot_create_challenge(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    grade7 = make_grade(db, school, "Grade 7")

    res = client.post("/api/v1/challenges", json=_quiz_payload([grade7.id]), headers=auth_headers(teacher))

    assert res.status_code == 403


def test_admin_creates_grade_scoped_quiz_and_visibility_is_grade_based(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    grade7 = make_grade(db, school, "Grade 7")
    grade9 = make_grade(db, school, "Grade 9")
    student_in_7 = make_user(db, school, UserRole.STUDENT, grade=grade7)
    student_in_9 = make_user(db, school, UserRole.STUDENT, grade=grade9)

    create_res = client.post("/api/v1/challenges", json=_quiz_payload([grade7.id]), headers=auth_headers(admin))
    assert create_res.status_code == 200
    challenge_id = create_res.json()["id"]

    visible_to_7 = client.get("/api/v1/challenges", headers=auth_headers(student_in_7)).json()
    visible_to_9 = client.get("/api/v1/challenges", headers=auth_headers(student_in_9)).json()

    assert any(c["id"] == challenge_id for c in visible_to_7)
    assert not any(c["id"] == challenge_id for c in visible_to_9)


def test_student_does_not_see_answer_key_before_submitting(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    grade7 = make_grade(db, school, "Grade 7")
    student = make_user(db, school, UserRole.STUDENT, grade=grade7)

    challenge_id = client.post(
        "/api/v1/challenges", json=_quiz_payload([grade7.id]), headers=auth_headers(admin)
    ).json()["id"]

    detail = client.get(f"/api/v1/challenges/{challenge_id}", headers=auth_headers(student)).json()

    for q in detail["questions"]:
        assert q.get("correctIndex") is None
        assert q.get("correctAnswer") is None


def test_submit_auto_grades_and_awards_bonus_xp_once(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    grade7 = make_grade(db, school, "Grade 7")
    student = make_user(db, school, UserRole.STUDENT, grade=grade7)

    challenge_id = client.post(
        "/api/v1/challenges", json=_quiz_payload([grade7.id]), headers=auth_headers(admin)
    ).json()["id"]

    detail = client.get(f"/api/v1/challenges/{challenge_id}", headers=auth_headers(student)).json()
    q_mcq = next(q for q in detail["questions"] if q["type"] == "mcq")
    q_tf = next(q for q in detail["questions"] if q["type"] == "true_false")

    submit_res = client.post(
        f"/api/v1/challenges/{challenge_id}/submit",
        json={"answers": [
            {"questionId": q_mcq["id"], "selectedIndex": 1},
            {"questionId": q_tf["id"], "selectedAnswer": True},
        ]},
        headers=auth_headers(student),
    )

    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["score"] == 2
    assert result["maxScore"] == 2
    assert result["correctCount"] == 2
    assert result["bonusXpAwarded"] == 20

    # Second submission must be refused -- one shot per student.
    again = client.post(
        f"/api/v1/challenges/{challenge_id}/submit",
        json={"answers": []},
        headers=auth_headers(student),
    )
    assert again.status_code == 400
