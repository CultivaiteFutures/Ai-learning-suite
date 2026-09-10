"""
Regression tests for Task #50 (in-lesson notes, highlighting, bookmarking):
a student can save/read their own notepad + highlights + bookmark flag for
a lesson in a course they're enrolled in, cannot for one they aren't, and
the bookmarks list only returns lessons they've actually bookmarked.
"""
from app.models.user import UserRole
from factories import make_school, make_user, make_course, make_lesson, make_enrollment, auth_headers


def test_student_can_save_and_read_own_notes(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    lesson = make_lesson(db, course)
    make_enrollment(db, school, student, course)

    res = client.put(
        f"/api/v1/student/lessons/{lesson.id}/notes",
        json={"notesText": "Remember the quadratic formula.", "highlights": [{"text": "ax^2+bx+c=0"}], "isBookmarked": True},
        headers=auth_headers(student),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["notesText"] == "Remember the quadratic formula."
    assert body["highlights"] == [{"text": "ax^2+bx+c=0"}]
    assert body["isBookmarked"] is True

    get_res = client.get(f"/api/v1/student/lessons/{lesson.id}/notes", headers=auth_headers(student))
    assert get_res.json()["notesText"] == "Remember the quadratic formula."


def test_student_gets_empty_notes_by_default(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    lesson = make_lesson(db, course)
    make_enrollment(db, school, student, course)

    res = client.get(f"/api/v1/student/lessons/{lesson.id}/notes", headers=auth_headers(student))
    assert res.status_code == 200
    assert res.json()["notesText"] is None
    assert res.json()["isBookmarked"] is False


def test_student_cannot_note_a_lesson_they_are_not_enrolled_in(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    lesson = make_lesson(db, course)
    # note: no enrollment created

    res = client.put(
        f"/api/v1/student/lessons/{lesson.id}/notes",
        json={"notesText": "sneaky", "highlights": [], "isBookmarked": False},
        headers=auth_headers(student),
    )
    assert res.status_code == 403


def test_bookmarks_list_only_returns_bookmarked_lessons(client, db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    lesson1 = make_lesson(db, course, title="Lesson 1")
    lesson2 = make_lesson(db, course, title="Lesson 2")
    make_enrollment(db, school, student, course)

    client.put(f"/api/v1/student/lessons/{lesson1.id}/notes", json={"highlights": [], "isBookmarked": True}, headers=auth_headers(student))
    client.put(f"/api/v1/student/lessons/{lesson2.id}/notes", json={"highlights": [], "isBookmarked": False}, headers=auth_headers(student))

    res = client.get("/api/v1/student/bookmarks", headers=auth_headers(student))
    assert res.status_code == 200
    ids = [b["lessonId"] for b in res.json()]
    assert ids == [lesson1.id]
