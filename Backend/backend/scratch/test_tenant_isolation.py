import os
import io
import sys
import pypdf
from pypdf import PdfWriter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app, init_superadmin
from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.school import School
from app.models.course import Course, Module, Lesson
from app.models.lms import Grade, Enrollment, LessonProgress, Assignment, Submission, StudentStats
from app.models.platform import Subscription, ActivityLog

def clean_all_data():
    db = SessionLocal()
    try:
        db.query(ActivityLog).delete()
        db.query(Submission).delete()
        db.query(Assignment).delete()
        db.query(LessonProgress).delete()
        db.query(Lesson).delete()
        db.query(Module).delete()
        db.query(Enrollment).delete()
        db.query(Course).delete()
        db.query(StudentStats).delete()
        db.query(User).filter(User.role != UserRole.SUPER_ADMIN).delete()
        db.query(Grade).delete()
        db.query(Subscription).delete()
        db.query(School).delete()
        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

def run_tests():
    print("===========================================================")
    print("STARTING COMPLETE E2E VERIFICATION WITH REAL POSTGRESQL")
    print(f"Database URL: {settings.DATABASE_URL}")
    print("===========================================================")

    clean_all_data()
    init_superadmin()
    client = TestClient(app)

    db = SessionLocal()
    sa_count = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).count()
    assert sa_count >= 1, "Super admin was not created in PostgreSQL!"
    print(f"[PASS] PostgreSQL SuperAdmin Initialized. Count: {sa_count}")
    db.close()

    # 1. Super Admin Login & School Creation
    print("\n--- 1. TESTING SUPER ADMIN WORKFLOW ---")
    res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert res.status_code == 200, f"Super admin login failed: {res.text}"
    sa_token = res.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] Super Admin Login Successful.")

    # Create School A
    res = client.post("/api/v1/super-admin/schools", json={
        "name": "Apex International Academy",
        "domain": "apex.edu",
        "admin_email": "admin@apex.edu",
        "admin_name": "Apex Admin",
        "admin_password": "AdminPass123!",
        "plan": "Enterprise"
    }, headers=sa_headers)
    assert res.status_code == 200, f"Create School A failed: {res.text}"
    school_a = res.json()
    school_a_id = school_a["id"]
    print(f"[PASS] School A created in PostgreSQL: {school_a['name']} (ID: {school_a_id})")

    # Create School B (for multi-tenant isolation testing)
    res = client.post("/api/v1/super-admin/schools", json={
        "name": "Beacon Valley High",
        "domain": "beacon.edu",
        "admin_email": "admin@beacon.edu",
        "admin_name": "Beacon Admin",
        "admin_password": "AdminPass123!",
        "plan": "Standard"
    }, headers=sa_headers)
    assert res.status_code == 200, f"Create School B failed: {res.text}"
    school_b = res.json()
    school_b_id = school_b["id"]
    print(f"[PASS] School B created in PostgreSQL: {school_b['name']} (ID: {school_b_id})")

    # Super Admin Creates Golden Source Template
    res = client.post("/api/v1/super-admin/golden-templates", json={
        "title": "Platform Foundational Physics",
        "description": "Standardized physics curriculum",
        "subject": "Physics",
        "grade_level": "Grade 10",
        "modules": [
            {
                "title": "Unit 1: Kinematics",
                "description": "Motion in 1D and 2D",
                "lessons": [
                    {"title": "1.1 Velocity and Acceleration", "content": "Core kinematics equations.", "duration_minutes": 40}
                ]
            }
        ]
    }, headers=sa_headers)
    assert res.status_code == 200, f"Golden template failed: {res.text}"
    golden = res.json()
    golden_id = golden["id"]
    print(f"[PASS] Golden Source Template created: {golden['title']} (ID: {golden_id})")

    # Platform Stats check
    res = client.get("/api/v1/super-admin/stats", headers=sa_headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["totalSchools"] >= 2
    print(f"[PASS] Platform Stats Verified in PostgreSQL: {stats}")

    # 2. School Admin Workflow (School A)
    print("\n--- 2. TESTING SCHOOL ADMIN (SCHOOL A) WORKFLOW ---")
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@apex.edu",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200, f"School A admin login failed: {res.text}"
    admin_a_token = res.json()["access_token"]
    admin_a_headers = {"Authorization": f"Bearer {admin_a_token}"}
    print("[PASS] School A Admin Login Successful.")

    # Create Grade
    res = client.post("/api/v1/school-admin/grades", json={
        "name": "Grade 10",
        "code": "G10"
    }, headers=admin_a_headers)
    assert res.status_code == 200, f"Grade creation failed: {res.text}"
    grade_a_id = res.json()["id"]
    print(f"[PASS] Grade created in PostgreSQL: Grade 10 (ID: {grade_a_id})")

    # Create Teacher
    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Dr. Eleanor Vance",
        "email": "eleanor.vance@apex.edu",
        "password": "TeacherPass123!"
    }, headers=admin_a_headers)
    assert res.status_code == 200, f"Teacher creation failed: {res.text}"
    teacher_a_id = res.json()["id"]
    print(f"[PASS] Teacher created in PostgreSQL: Dr. Eleanor Vance (ID: {teacher_a_id})")

    # Create Students
    res = client.post("/api/v1/school-admin/students", json={
        "name": "Leo Sterling",
        "email": "leo.sterling@apex.edu",
        "password": "StudentPass123!",
        "grade_id": grade_a_id
    }, headers=admin_a_headers)
    assert res.status_code == 200, f"Student 1 failed: {res.text}"
    student_a1_id = res.json()["id"]

    res = client.post("/api/v1/school-admin/students", json={
        "name": "Clara Oswald",
        "email": "clara.oswald@apex.edu",
        "password": "StudentPass123!",
        "grade_id": grade_a_id
    }, headers=admin_a_headers)
    assert res.status_code == 200, f"Student 2 failed: {res.text}"
    student_a2_id = res.json()["id"]
    print("[PASS] Students created in PostgreSQL: Leo Sterling, Clara Oswald")

    # School Admin stats check
    res = client.get("/api/v1/school-admin/stats", headers=admin_a_headers)
    assert res.status_code == 200
    admin_stats = res.json()
    assert admin_stats["teachersCount"] == 1
    assert admin_stats["studentsCount"] == 2
    assert admin_stats["gradesCount"] == 1
    print(f"[PASS] School Admin Stats Verified: {admin_stats}")

    # 3. Teacher Workflow (School A)
    print("\n--- 3. TESTING TEACHER (SCHOOL A) WORKFLOW ---")
    res = client.post("/api/v1/auth/login", json={
        "email": "eleanor.vance@apex.edu",
        "password": "TeacherPass123!"
    })
    assert res.status_code == 200, f"Teacher login failed: {res.text}"
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    print("[PASS] Teacher Login Successful.")

    # Create Course
    res = client.post("/api/v1/teacher/courses", json={
        "title": "Quantum Mechanics",
        "description": "Introduction to quantum concepts for secondary students.",
        "subject": "Physics",
        "grade_level": "Grade 10",
        "language": "English",
        "difficulty": "Advanced"
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Course creation failed: {res.text}"
    course = res.json()
    course_id = course["id"]
    join_code = course.get("join_code") or course.get("joinCode")
    assert join_code and len(join_code) >= 6, f"Join code missing! Got: {join_code}"
    print(f"[PASS] Course Created in PostgreSQL: {course['title']} | Join Code: {join_code}")

    # Add Module
    res = client.post(f"/api/v1/teacher/courses/{course_id}/modules", json={
        "title": "Module 1: Wave-Particle Duality",
        "description": "Examining the double slit experiment and photons."
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Module creation failed: {res.text}"
    module_1 = res.json()
    module_1_id = module_1["id"]
    print(f"[PASS] Module Created: {module_1['title']} (ID: {module_1_id})")

    # Add Lessons
    res = client.post(f"/api/v1/teacher/courses/{course_id}/modules/{module_1_id}/lessons", json={
        "title": "Lesson 1.1: The Photoelectric Effect",
        "content": "Einstein explanation of light quanta emitting electrons.",
        "summary": "Photons carry discrete packets of energy E = hf.",
        "duration_minutes": 45
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Lesson 1 failed: {res.text}"
    lesson_1 = res.json()
    lesson_1_id = lesson_1["id"]

    res = client.post(f"/api/v1/teacher/courses/{course_id}/modules/{module_1_id}/lessons", json={
        "title": "Lesson 1.2: De Broglie Wavelength",
        "content": "Matter waves and lambda = h/p.",
        "summary": "All matter exhibits wave-like behavior proportional to momentum.",
        "duration_minutes": 35
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Lesson 2 failed: {res.text}"
    lesson_2_id = res.json()["id"]
    print(f"[PASS] Lessons Created: {lesson_1['title']}, Lesson 1.2 Found")

    # Publish Course
    res = client.post("/api/v1/teacher/courses/" + course_id + "/publish", headers=teacher_headers)
    assert res.status_code == 200, f"Publish failed: {res.text}"
    assert res.json()["is_published"] is True
    print("[PASS] Course Published Successfully.")

    # Create Assignment
    res = client.post("/api/v1/teacher/assignments", json={
        "course_id": course_id,
        "lesson_id": lesson_1_id,
        "title": "Assignment 1: Photoelectric Work Function Problems",
        "description": "Calculate threshold frequencies and maximum kinetic energies.",
        "max_points": 100
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Assignment failed: {res.text}"
    assignment_id = res.json()["id"]
    print(f"[PASS] Assignment Created: ID {assignment_id}")

    # Adopt Golden Template
    res = client.post(f"/api/v1/teacher/adopt-template/{golden_id}", headers=teacher_headers)
    assert res.status_code == 200, f"Adopt golden failed: {res.text}"
    adopted = res.json()
    adopted_school_id = adopted.get("schoolId") or adopted.get("school_id")
    assert adopted_school_id == school_a_id
    assert (adopted.get("isGoldenTemplate") if "isGoldenTemplate" in adopted else adopted.get("is_golden_template")) is False
    print(f"[PASS] Golden Template adopted into School A course: {adopted.get('title') or adopted.get('name')}")

    # 4. Student Workflow (Leo Sterling)
    print("\n--- 4. TESTING STUDENT (SCHOOL A - LEO STERLING) WORKFLOW ---")
    res = client.post("/api/v1/auth/login", json={
        "email": "leo.sterling@apex.edu",
        "password": "StudentPass123!"
    })
    assert res.status_code == 200, f"Student login failed: {res.text}"
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[PASS] Student Login Successful.")

    # Student Joins Course with real join code
    res = client.post("/api/v1/student/join-course", json={"join_code": join_code}, headers=student_headers)
    assert res.status_code == 200, f"Course join failed: {res.text}"
    assert res.json()["id"] == course_id
    print(f"[PASS] Student Leo joined course using real join code '{join_code}' !")

    # Student Views Enrolled Courses
    res = client.get("/api/v1/student/enrolled-courses", headers=student_headers)
    assert res.status_code == 200
    enrolled_list = res.json()
    assert any(c["id"] == course_id for c in enrolled_list)
    print("[PASS] Student Enrolled Courses Verified in PostgreSQL.")

    # Student Completes Lesson 1.1
    res = client.post(f"/api/v1/student/lessons/{lesson_1_id}/complete", headers=student_headers)
    assert res.status_code == 200, f"Lesson complete failed: {res.text}"
    progress_data = res.json()
    assert progress_data["xp"] >= 50
    print(f"[PASS] Student completed lesson. XP: {progress_data['xp']}, Streak: {progress_data['streak']}")

    # Student checks assignments
    res = client.get("/api/v1/student/assignments", headers=student_headers)
    assert res.status_code == 200
    st_assignments = res.json()
    assert any(a["id"] == assignment_id for a in st_assignments)
    print("[PASS] Student can view assignment list from DB.")

    # Student Submits Assignment
    res = client.post(f"/api/v1/student/assignments/{assignment_id}/submit", json={
        "content": "Test submission content on quantum phenomena for grading.",
        "file_url": "https://apex.edu/files/submission1.pdf"
    }, headers=student_headers)
    assert res.status_code == 200, f"Submission failed: {res.text}"
    submission_id = res.json()["id"]
    print(f"[PASS] Assignment Submitted in PostgreSQL: Submission ID {submission_id}")

    # 5. Teacher Review & Grading
    print("\n--- 5. TESTING TEACHER REVIEW & GRADING ---")
    res = client.get("/api/v1/teacher/assignments/" + assignment_id + "/submissions", headers=teacher_headers)
    assert res.status_code == 200
    subs = res.json()
    assert any(s["id"] == submission_id for s in subs)
    print("[PASS] Teacher retrieved submissions list from PostgreSQL.")

    res = client.post("/api/v1/teacher/submissions/" + submission_id + "/grade", json={
        "grade_points": 98.5,
        "feedback": "Excellent derivation!"
    }, headers=teacher_headers)
    assert res.status_code == 200, f"Grading failed: {res.text}"
    graded_sub = res.json()
    assert (graded_sub.get("grade_points") or graded_sub.get("gradePoints")) == 98.5
    print("[PASS] Teacher graded submission with 98.5 points and feedback.")

    res = client.get("/api/v1/teacher/analytics", headers=teacher_headers)
    assert res.status_code == 200
    analytics = res.json()
    assert analytics.get("totalStudents") == 2 or analytics.get("total_students") == 2
    assert analytics.get("submissionsCount") == 1 or analytics.get("submissions_count") == 1
    print(f"[PASS] Teacher Analytics reflects real PostgreSQL state: {analytics}")

    # 6. Multi-Tenancy Isolation
    print("\n--- 6. TESTING MULTI-TENANCY ISOLATION ---")
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@beacon.edu",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200
    admin_b_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Professor Oak",
        "email": "oak@beacon.edu",
        "password": "TeacherPass123!"
    }, headers=admin_b_headers)
    assert res.status_code == 200

    res = client.post("/api/v1/school-admin/students", json={
        "name": "Ash Ketchum",
        "email": "ash@beacon.edu",
        "password": "StudentPass123!"
    }, headers=admin_b_headers)
    assert res.status_code == 200

    res = client.post("/api/v1/auth/login", json={"email": "oak@beacon.edu", "password": "TeacherPass123!"})
    assert res.status_code == 200
    teacher_b_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/v1/teacher/courses", json={
        "title": "Beacon Biology",
        "subject": "Biology",
        "grade_level": "Grade 11"
    }, headers=teacher_b_headers)
    assert res.status_code == 200
    course_b = res.json()
    course_b_id = course_b["id"]
    course_b_join_code = course_b.get("join_code") or course_b.get("joinCode")

    # Isolation 1: Teacher A tries to access School B course
    res = client.get("/api/v1/teacher/courses", headers=teacher_headers)
    assert all((c.get("school_id") or c.get("schoolId")) == school_a_id for c in res.json()), "Isolation breach in courses!"
    res = client.get("/api/v1/teacher/courses/" + course_b_id, headers=teacher_headers)
    assert res.status_code in [403, 404]
    print(f"[PASS] Teacher A isolated from School B course. Status: {res.status_code}")

    # Isolation 2: Student A tries to join School B course
    res = client.post("/api/v1/student/join-course", json={"join_code": course_b_join_code}, headers=student_headers)
    assert res.status_code in [403, 404]
    print(f"[PASS] Student A blocked from joining School B course via cross-tenant code.")

    # 7. PDF Processing & Live AI Integration
    print("\n--- 7. TESTING PDF PROCESSING & LIVE GEMINI AI INTEGRATION ---")
    pdf_writer = PdfWriter()
    pdf_writer.add_blank_page(width=72, height=72)
    pdf_bytes_io = io.BytesIO()
    pdf_writer.write(pdf_bytes_io)
    pdf_bytes = pdf_bytes_io.getvalue()

    res = client.post(
        "/api/v1/ai/generate-course-from-pdf",
        files={"file": ("syllabus.pdf", pdf_bytes, "application/pdf")},
        headers=teacher_headers
    )
    assert res.status_code == 200, f"Expected 200, got: {res.status_code} {res.text}"
    print(f"[PASS] PDF upload, text parsing, and Gemini AI course generation verified (200). Title: '{res.json().get('title')}'")

    res = client.post("/api/v1/ai/generate-course", json={"course_name": "Modern Physics", "grade": "Grade 11", "subject": "Physics"}, headers=teacher_headers)
    assert res.status_code == 200, f"Expected 200, got: {res.status_code} {res.text}"
    print(f"[PASS] AICourseBuilder Gemini generation verified (200). Title: '{res.json().get('title')}'")

    res = client.post("/api/v1/ai/tutor-chat", json={"question": "What is kinetic energy?", "course_id": course_id, "lesson_id": lesson_1_id}, headers=student_headers)
    assert res.status_code == 200, f"Expected 200, got: {res.status_code} {res.text}"
    print(f"[PASS] AI Tutor chat Gemini response verified (200). Reply: {res.json().get('reply')[:80]}...")

    # 8. Clean up test data
    print("\n--- 8. CLEANING TEMPORARY TEST DATA FROM POSTGRESQL ---")
    db = SessionLocal()
    db.query(ActivityLog).delete()
    db.query(Submission).delete()
    db.query(Assignment).delete()
    db.query(LessonProgress).delete()
    db.query(Lesson).delete()
    db.query(Module).delete()
    db.query(Enrollment).delete()
    db.query(Course).delete()
    db.query(StudentStats).delete()
    db.query(User).filter(User.role != UserRole.SUPER_ADMIN).delete()
    db.query(Grade).delete()
    db.query(Subscription).delete()
    db.query(School).delete()
    db.commit()

    school_c = db.query(School).count()
    course_c = db.query(Course).count()
    user_c = db.query(User).count()
    db.close()

    print(f"[PASS] Database Cleaned After Verification. Schools: {school_c}, Courses: {course_c}, Users: {user_c} (SuperAdmin bootstrap ready)")
    print("\n%%% E2E TESTING COMPLETED_SUCCESSFULLY %%%\n")

if __name__ == '__main__':
    run_tests()

