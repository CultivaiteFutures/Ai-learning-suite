"""
Regression tests for Task #44 (direct 1:1 messaging). The core rule under
test: a Teacher, Student, or Parent may only start/see a conversation with
someone they actually have a relationship with through course enrollment
(directly, or via a linked child for a Parent) -- never an open directory
of every user in the school.
"""
from app.models.user import UserRole
from app.models.notification import Notification
from factories import make_school, make_grade, make_user, make_course, enroll, link_parent, auth_headers


def _setup_teacher_student(db):
    school = make_school(db)
    teacher = make_user(db, school, UserRole.TEACHER)
    student = make_user(db, school, UserRole.STUDENT)
    course = make_course(db, school, teacher=teacher)
    enroll(db, school, student, course)
    return school, teacher, student, course


def test_teacher_contacts_include_enrolled_student_and_linked_parent(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    parent = make_user(db, school, UserRole.PARENT)
    link_parent(db, school, parent, student)

    res = client.get("/api/v1/messages/contacts", headers=auth_headers(teacher))
    assert res.status_code == 200
    contact_ids = {c["id"] for c in res.json()}
    assert student.id in contact_ids
    assert parent.id in contact_ids


def test_teacher_contacts_exclude_students_of_another_teachers_course(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    other_teacher = make_user(db, school, UserRole.TEACHER)
    other_student = make_user(db, school, UserRole.STUDENT)
    other_course = make_course(db, school, teacher=other_teacher)
    enroll(db, school, other_student, other_course)

    res = client.get("/api/v1/messages/contacts", headers=auth_headers(teacher))
    contact_ids = {c["id"] for c in res.json()}
    assert other_student.id not in contact_ids


def test_student_contacts_show_only_their_course_teacher(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    other_teacher = make_user(db, school, UserRole.TEACHER)

    res = client.get("/api/v1/messages/contacts", headers=auth_headers(student))
    contact_ids = {c["id"] for c in res.json()}
    assert teacher.id in contact_ids
    assert other_teacher.id not in contact_ids


def test_parent_contacts_show_only_linked_childs_course_teacher(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    parent = make_user(db, school, UserRole.PARENT)
    link_parent(db, school, parent, student)
    other_teacher = make_user(db, school, UserRole.TEACHER)

    res = client.get("/api/v1/messages/contacts", headers=auth_headers(parent))
    contact_ids = {c["id"] for c in res.json()}
    assert teacher.id in contact_ids
    assert other_teacher.id not in contact_ids


def test_cannot_start_conversation_with_unrelated_user(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    unrelated_student = make_user(db, school, UserRole.STUDENT)

    res = client.post(
        "/api/v1/messages/conversations",
        json={"recipientId": unrelated_student.id},
        headers=auth_headers(teacher),
    )
    assert res.status_code == 403


def test_starting_conversation_twice_returns_same_conversation(client, db):
    school, teacher, student, course = _setup_teacher_student(db)

    first = client.post("/api/v1/messages/conversations", json={"recipientId": student.id}, headers=auth_headers(teacher))
    second = client.post("/api/v1/messages/conversations", json={"recipientId": teacher.id}, headers=auth_headers(student))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_send_message_notifies_recipient_and_marks_read_on_open(client, db):
    school, teacher, student, course = _setup_teacher_student(db)

    convo = client.post("/api/v1/messages/conversations", json={"recipientId": student.id}, headers=auth_headers(teacher)).json()
    convo_id = convo["id"]

    send_res = client.post(
        f"/api/v1/messages/conversations/{convo_id}/messages",
        json={"body": "Please see me after class"},
        headers=auth_headers(teacher),
    )
    assert send_res.status_code == 200
    assert send_res.json()["isMine"] is True

    notif = db.query(Notification).filter(Notification.user_id == student.id, Notification.type == "new_message").first()
    assert notif is not None
    assert notif.link == "/student/messages"

    listing = client.get("/api/v1/messages/conversations", headers=auth_headers(student)).json()
    assert listing[0]["unreadCount"] == 1

    messages = client.get(f"/api/v1/messages/conversations/{convo_id}/messages", headers=auth_headers(student)).json()
    assert len(messages) == 1
    assert messages[0]["isMine"] is False

    listing_after = client.get("/api/v1/messages/conversations", headers=auth_headers(student)).json()
    assert listing_after[0]["unreadCount"] == 0


def test_user_not_in_conversation_gets_404(client, db):
    school, teacher, student, course = _setup_teacher_student(db)
    outsider = make_user(db, school, UserRole.TEACHER)

    convo = client.post("/api/v1/messages/conversations", json={"recipientId": student.id}, headers=auth_headers(teacher)).json()

    res = client.get(f"/api/v1/messages/conversations/{convo['id']}/messages", headers=auth_headers(outsider))
    assert res.status_code == 404
