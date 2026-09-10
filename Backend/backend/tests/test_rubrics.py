"""
Regression tests for Task #46 (rubric-based grading): a Teacher's rubric is
private to them (Admin excepted), attaching someone else's rubric to an
assignment is rejected, and grading against a rubric derives the total
from criterion scores rather than trusting a raw point number.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, make_grade, enroll, auth_headers


def _rubric_payload():
    return {
        "title": "Essay Rubric",
        "criteria": [
            {"title": "Thesis", "description": "Clear thesis statement", "maxPoints": 10},
            {"title": "Evidence", "description": "Uses supporting evidence", "maxPoints": 15},
            {"title": "Grammar", "maxPoints": 5},
        ],
    }


def test_teacher_can_create_and_list_own_rubric(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)

    res = client.post("/api/v1/rubrics", json=_rubric_payload(), headers=auth_headers(teacher))
    assert res.status_code == 200
    body = res.json()
    assert body["totalPoints"] == 30
    assert len(body["criteria"]) == 3

    listing = client.get("/api/v1/rubrics", headers=auth_headers(teacher)).json()
    assert len(listing) == 1


def test_teacher_cannot_see_another_teachers_rubric(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    other_teacher = make_user(db, school, UserRole.TEACHER)

    res = client.post("/api/v1/rubrics", json=_rubric_payload(), headers=auth_headers(teacher))
    rubric_id = res.json()["id"]

    get_res = client.get(f"/api/v1/rubrics/{rubric_id}", headers=auth_headers(other_teacher))
    assert get_res.status_code == 403

    listing = client.get("/api/v1/rubrics", headers=auth_headers(other_teacher)).json()
    assert listing == []


def test_admin_can_see_every_rubric_in_school(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    admin = make_user(db, school, UserRole.ADMIN)

    client.post("/api/v1/rubrics", json=_rubric_payload(), headers=auth_headers(teacher))

    listing = client.get("/api/v1/rubrics", headers=auth_headers(admin)).json()
    assert len(listing) == 1


def _setup_course_with_rubric(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)

    rubric_res = client.post("/api/v1/rubrics", json=_rubric_payload(), headers=auth_headers(teacher))
    rubric = rubric_res.json()

    assignment_res = client.post(
        "/api/v1/teacher/assignments",
        json={"courseId": course.id, "title": "Essay 1", "maxPoints": 30, "rubricId": rubric["id"]},
        headers=auth_headers(teacher),
    )
    assignment = assignment_res.json()
    return school, teacher, student, course, rubric, assignment


def test_cannot_attach_another_teachers_rubric_to_an_assignment(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    other_teacher = make_user(db, school, UserRole.TEACHER)
    course = make_course(db, school, teacher=teacher)

    rubric_res = client.post("/api/v1/rubrics", json=_rubric_payload(), headers=auth_headers(other_teacher))
    rubric_id = rubric_res.json()["id"]

    res = client.post(
        "/api/v1/teacher/assignments",
        json={"courseId": course.id, "title": "Essay 1", "rubricId": rubric_id},
        headers=auth_headers(teacher),
    )
    assert res.status_code == 403


def test_grading_against_rubric_derives_total_from_criteria(client, db):
    school, teacher, student, course, rubric, assignment = _setup_course_with_rubric(client, db)

    submit_res = client.post(
        f"/api/v1/student/assignments/{assignment['id']}/submit",
        json={"content": "My essay"},
        headers=auth_headers(student),
    )
    submission_id = submit_res.json()["id"]

    criteria = rubric["criteria"]
    rubric_scores = [
        {"criterionId": criteria[0]["id"], "pointsAwarded": 8},
        {"criterionId": criteria[1]["id"], "pointsAwarded": 12},
        {"criterionId": criteria[2]["id"], "pointsAwarded": 5},
    ]

    grade_res = client.post(
        f"/api/v1/teacher/submissions/{submission_id}/grade",
        json={"rubricScores": rubric_scores, "gradePoints": 999, "feedback": "Nice work"},
        headers=auth_headers(teacher),
    )
    assert grade_res.status_code == 200
    body = grade_res.json()
    assert body["gradePoints"] == 25.0  # derived from rubric, NOT the passed 999
    assert len(body["rubricScores"]) == 3


def test_grading_rejects_score_above_criterion_max(client, db):
    school, teacher, student, course, rubric, assignment = _setup_course_with_rubric(client, db)

    submit_res = client.post(
        f"/api/v1/student/assignments/{assignment['id']}/submit",
        json={"content": "My essay"},
        headers=auth_headers(student),
    )
    submission_id = submit_res.json()["id"]

    criteria = rubric["criteria"]
    over_max_score = [{"criterionId": criteria[0]["id"], "pointsAwarded": 999}]

    res = client.post(
        f"/api/v1/teacher/submissions/{submission_id}/grade",
        json={"rubricScores": over_max_score},
        headers=auth_headers(teacher),
    )
    assert res.status_code == 400


def test_deleting_rubric_detaches_it_from_assignment(client, db):
    school, teacher, student, course, rubric, assignment = _setup_course_with_rubric(client, db)

    del_res = client.delete(f"/api/v1/rubrics/{rubric['id']}", headers=auth_headers(teacher))
    assert del_res.status_code == 200

    updated_assignment = client.get("/api/v1/teacher/assignments", headers=auth_headers(teacher)).json()
    match = next(a for a in updated_assignment if a["id"] == assignment["id"])
    assert match["rubricId"] is None
