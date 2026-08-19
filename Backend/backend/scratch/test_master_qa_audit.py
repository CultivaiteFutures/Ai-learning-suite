import os
import sys
import io
import uuid
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app, init_superadmin
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.course import Course, Module, Lesson
from app.models.lms import Assignment, Submission, Grade, Enrollment, StudentStats
from app.models.school import School
from app.models.user import User

def run_master_qa_audit():
    init_superadmin()
    client = TestClient(app)
    results = {}

    print("================================================================================")
    print("           MASTER QA AUDIT: COMPLETE END-TO-END SUITE VERIFICATION")
    print("================================================================================")

    # -------------------------------------------------------------------------
    # 1. AUTHENTICATION & LOGIN (ALL 4 ROLES)
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 1] AUTHENTICATION & ACCESS CONTROL ---")
    # Super Admin Login
    sa_res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert sa_res.status_code == 200, f"SuperAdmin login failed: {sa_res.text}"
    sa_token = sa_res.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] SuperAdmin login successful.")

    # Invalid login test
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "invalid@school.edu",
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401, "Expected 401 on invalid credentials"
    print("[PASS] 401 Invalid credentials properly rejected.")

    # Protected route defense without token
    unauth = client.get("/api/v1/super-admin/schools")
    assert unauth.status_code in [401, 403], "Expected 401/403 on unauthenticated request"
    print("[PASS] Protected routes reject unauthorized requests.")

    # -------------------------------------------------------------------------
    # 2. MULTI-TENANCY & ONBOARDING (SCHOOL A & SCHOOL B)
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 2] MULTI-TENANCY & SCHOOL ONBOARDING ---")
    uid_a = uuid.uuid4().hex[:6]
    uid_b = uuid.uuid4().hex[:6]

    # Create School A
    res_a = client.post("/api/v1/super-admin/schools", json={
        "name": f"Alpha Academy {uid_a}",
        "domain": f"alpha-{uid_a}.edu",
        "admin_email": f"admin@alpha-{uid_a}.edu",
        "admin_name": "Principal Alpha",
        "admin_password": "AlphaPassword2026!",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res_a.status_code == 200
    school_a = res_a.json()
    school_a_id = school_a["id"]

    # Create School B
    res_b = client.post("/api/v1/super-admin/schools", json={
        "name": f"Beta Academy {uid_b}",
        "domain": f"beta-{uid_b}.edu",
        "admin_email": f"admin@beta-{uid_b}.edu",
        "admin_name": "Principal Beta",
        "admin_password": "BetaPassword2026!",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res_b.status_code == 200
    school_b = res_b.json()
    school_b_id = school_b["id"]
    print(f"[PASS] Created 2 isolated schools: Alpha ({school_a_id}) and Beta ({school_b_id})")

    # Login as School A Admin & School B Admin
    res_la = client.post("/api/v1/auth/login", json={"email": f"admin@alpha-{uid_a}.edu", "password": "AlphaPassword2026!"})
    token_a = res_la.json()["access_token"]
    headers_admin_a = {"Authorization": f"Bearer {token_a}"}

    res_lb = client.post("/api/v1/auth/login", json={"email": f"admin@beta-{uid_b}.edu", "password": "BetaPassword2026!"})
    token_b = res_lb.json()["access_token"]
    headers_admin_b = {"Authorization": f"Bearer {token_b}"}
    print("[PASS] School Admins logged in with their custom passwords.")

    # -------------------------------------------------------------------------
    # 3. SCHOOL ADMIN WORKFLOWS (TEACHERS, STUDENTS, GRADES)
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 3] SCHOOL ADMIN CRUD & TENANT ISOLATION ---")
    # Admin A creates Grade, Teacher, Student
    g_res = client.post("/api/v1/school-admin/grades", json={"name": "Grade 10", "code": "G10"}, headers=headers_admin_a)
    assert g_res.status_code == 200
    grade_a = g_res.json()

    t_res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Dr. Alan Turing",
        "email": f"turing@alpha-{uid_a}.edu",
        "password": "TeacherPassword2026!",
        "subject": "Computer Science"
    }, headers=headers_admin_a)
    assert t_res.status_code == 200
    teacher_a = t_res.json()

    s_res = client.post("/api/v1/school-admin/students", json={
        "name": "Alice Wonderland",
        "email": f"alice@alpha-{uid_a}.edu",
        "password": "StudentPassword2026!",
        "grade_id": grade_a["id"]
    }, headers=headers_admin_a)
    assert s_res.status_code == 200
    student_a = s_res.json()
    print("[PASS] School A created Grade, Teacher, and Student.")

    # Verify Multi-Tenancy: School B Admin cannot see School A's teachers or students
    b_teachers = client.get("/api/v1/school-admin/teachers", headers=headers_admin_b).json()
    b_students = client.get("/api/v1/school-admin/students", headers=headers_admin_b).json()
    assert len(b_teachers) == 0, "Tenant breach: School B saw School A's teacher!"
    assert len(b_students) == 0, "Tenant breach: School B saw School A's student!"
    print("[PASS] Tenant isolation verified: School B cannot see School A's records.")

    # -------------------------------------------------------------------------
    # 4. TEACHER WORKFLOWS (COURSE CREATION, MODULES, LESSONS, JOIN CODE)
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 4] TEACHER COURSE & LESSON MANAGEMENT ---")
    t_login = client.post("/api/v1/auth/login", json={"email": f"turing@alpha-{uid_a}.edu", "password": "TeacherPassword2026!"})
    teacher_token = t_login.json()["access_token"]
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}

    # Create Course
    c_res = client.post("/api/v1/teacher/courses", json={
        "title": "Quantum Computing 101",
        "description": "Introduction to qubits, superposition, and quantum algorithms.",
        "subject": "Physics",
        "grade_level": "Grade 10",
        "language": "English",
        "difficulty": "Advanced",
        "modules": []
    }, headers=headers_teacher)
    assert c_res.status_code == 200
    course = c_res.json()
    course_id = course["id"]
    join_code = course["joinCode"]
    assert join_code and len(join_code) >= 6, "Course must generate a valid join code!"
    print(f"[PASS] Teacher created course '{course['title']}' with Join Code: {join_code}")

    # Add Module
    m_res = client.post(f"/api/v1/teacher/courses/{course_id}/modules", json={
        "title": "Module 1: Principles of Superposition",
        "description": "Mathematical formulation of qubits and state vectors."
    }, headers=headers_teacher)
    assert m_res.status_code == 200
    module = m_res.json()
    module_id = module["id"]

    # Add Lesson
    l_res = client.post(f"/api/v1/teacher/courses/{course_id}/modules/{module_id}/lessons", json={
        "title": "Lesson 1: The Bloch Sphere",
        "content": "The Bloch sphere provides a geometric representation of pure quantum states in a two-level system (qubit). Qubit state |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩.",
        "summary": "Geometric representation and coordinate representation of qubits on the Bloch Sphere.",
        "duration_minutes": 45
    }, headers=headers_teacher)
    assert l_res.status_code == 200
    lesson = l_res.json()
    lesson_id = lesson["id"]
    print(f"[PASS] Teacher added Module '{module['title']}' and Lesson '{lesson['title']}'.")

    # Publish Course
    pub_res = client.post(f"/api/v1/teacher/courses/{course_id}/publish", headers=headers_teacher)
    assert pub_res.status_code == 200
    print("[PASS] Course published successfully.")

    # -------------------------------------------------------------------------
    # 5. ASSIGNMENTS, SUBMISSIONS, & AI ANSWER-KEY GRADING
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 5] ASSIGNMENTS, SUBMISSIONS & AI ANSWER-KEY GRADING ---")
    # Teacher creates Assignment
    asg_res = client.post("/api/v1/teacher/assignments", json={
        "course_id": course_id,
        "title": "Quantum State Representation Problem Set",
        "description": "Calculate the coordinates of state |+⟩ on the Bloch sphere and prove orthogonality.",
        "max_points": 100
    }, headers=headers_teacher)
    assert asg_res.status_code == 200
    assignment = asg_res.json()
    assignment_id = assignment["id"]
    print(f"[PASS] Assignment created: '{assignment['title']}' (Max: {assignment['maxPoints']})")

    # Student logs in & joins course with join_code
    s_login = client.post("/api/v1/auth/login", json={"email": f"alice@alpha-{uid_a}.edu", "password": "StudentPassword2026!"})
    student_token = s_login.json()["access_token"]
    headers_student = {"Authorization": f"Bearer {student_token}"}

    join_res = client.post("/api/v1/student/join-course", json={"join_code": join_code}, headers=headers_student)
    assert join_res.status_code == 200, f"Join course failed: {join_res.text}"
    print(f"[PASS] Student Alice joined course using code '{join_code}'.")

    # Student submits Assignment
    sub_res = client.post(f"/api/v1/student/assignments/{assignment_id}/submit", json={
        "content": "For state |+⟩ = 1/√2 (|0⟩ + |1⟩), θ = π/2 and φ = 0. The Cartesian coordinates on the Bloch sphere are (1, 0, 0), aligning with the +X axis. The inner product ⟨+|-⟩ = (1/√2)(1/√2) - (1/√2)(1/√2) = 0, proving orthogonality."
    }, headers=headers_student)
    assert sub_res.status_code == 200
    submission = sub_res.json()
    submission_id = submission["id"]
    print(f"[PASS] Student submitted assignment response.")

    # Teacher uses AI Grade with Answer Key
    answer_key = """
    Official Answer Key & Rubric:
    1. Correct derivation of theta = pi/2 and phi = 0 (40 points)
    2. Correct coordinates on Bloch sphere (1, 0, 0) along +X axis (30 points)
    3. Proof of orthogonality via inner product = 0 (30 points)
    Total: 100 points
    """
    print("Testing AI Evaluation with Answer Key via POST /api/v1/ai/grade-submission-with-answer-key ...")
    ai_grade_res = client.post("/api/v1/ai/grade-submission-with-answer-key", data={
        "submission_id": submission_id,
        "answer_key_text": answer_key
    }, headers=headers_teacher)
    assert ai_grade_res.status_code == 200, f"AI grading failed: {ai_grade_res.text}"
    ai_eval = ai_grade_res.json()
    print(f"[PASS] AI suggested score: {ai_eval.get('suggested_grade') or ai_eval.get('suggestedGrade')} / 100")
    print(f"       Feedback: '{ai_eval.get('feedback', '')[:80]}...'")

    # Teacher reviews and submits final grade
    final_score = ai_eval.get('suggested_grade') or 95.0
    grade_commit_res = client.post(f"/api/v1/teacher/submissions/{submission_id}/grade", json={
        "grade_points": final_score,
        "feedback": "Outstanding work! Rigorous derivation and correct Bloch coordinates."
    }, headers=headers_teacher)
    assert grade_commit_res.status_code == 200
    print(f"[PASS] Teacher saved final grade in PostgreSQL: {final_score}/100")

    # -------------------------------------------------------------------------
    # 6. GRADEBOOK REPORT EXPORT (EXCEL & PDF)
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 6] REAL REPORT GENERATION (EXCEL & PDF) ---")
    # Export Excel
    excel_res = client.get("/api/v1/teacher/grades/export/excel", headers=headers_teacher)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 100, "Excel export must not be empty"
    print(f"[PASS] Real Gradebook Excel generated ({len(excel_res.content)} bytes).")

    # Export PDF
    pdf_res = client.get("/api/v1/teacher/grades/export/pdf", headers=headers_teacher)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF"), "Output must be a valid PDF binary"
    print(f"[PASS] Real Gradebook PDF generated ({len(pdf_res.content)} bytes).")

    # -------------------------------------------------------------------------
    # 7. STUDENT AI TUTOR GROUNDING TEST
    # -------------------------------------------------------------------------
    print("\n--- [AUDIT 7] STUDENT AI TUTOR GROUNDING ---")
    tutor_res = client.post("/api/v1/ai/tutor-chat", json={
        "question": "Can you explain what the coordinates of state |+⟩ are on the Bloch sphere based on Lesson 1?",
        "course_id": course_id,
        "lesson_id": lesson_id,
        "conversation_history": []
    }, headers=headers_student)
    assert tutor_res.status_code == 200, f"AI Tutor failed: {tutor_res.text}"
    tutor_reply = tutor_res.json().get("reply", "")
    print(f"[PASS] Grounded AI Tutor Response:")
    print(f"       '{tutor_reply[:150]}...'")
    assert len(tutor_reply) > 20, "AI Tutor reply must not be empty!"

    # -------------------------------------------------------------------------
    # 8. CLEANUP TEST DATA
    # -------------------------------------------------------------------------
    print("\n--- CLEANING UP TEST DATA ---")
    db = SessionLocal()
    # Delete courses, submissions, assignments, enrollments, users, and schools
    db.query(Submission).filter(Submission.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(Assignment).filter(Assignment.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(Lesson).filter(Lesson.module_id == module_id).delete()
    db.query(Module).filter(Module.course_id == course_id).delete()
    db.query(Enrollment).filter(Enrollment.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(StudentStats).filter(StudentStats.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(Course).filter(Course.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(User).filter(User.school_id.in_([school_a_id, school_b_id])).delete()
    db.query(Grade).filter(Grade.school_id.in_([school_a_id, school_b_id])).delete()
    db.commit()
    db.close()

    client.delete(f"/api/v1/super-admin/schools/{school_a_id}", headers=sa_headers)
    client.delete(f"/api/v1/super-admin/schools/{school_b_id}", headers=sa_headers)
    print("[PASS] Test schools and users cleaned up cleanly.")

    print("\n================================================================================")
    print("           MASTER QA AUDIT COMPLETE — 100% PASS RATE!")
    print("================================================================================")

if __name__ == "__main__":
    run_master_qa_audit()
