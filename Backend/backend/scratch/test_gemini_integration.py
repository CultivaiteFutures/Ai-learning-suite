import os
import io
import sys
import json
import pypdf
from pypdf import PdfWriter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app, init_superadmin
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.school import School
from app.models.course import Course, Module, Lesson
from app.models.lms import Grade, Enrollment, LessonProgress, Assignment, Submission, StudentStats
from app.models.platform import Subscription, ActivityLog
from app.services.ai_providers.factory import get_ai_provider
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.claude_provider import ClaudeAIProvider

def clean_data():
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
    except Exception:
        db.rollback()
    finally:
        db.close()

def run_tests():
    print("===========================================================")
    print("STARTING REAL GOOGLE GEMINI AI INTEGRATION VERIFICATION")
    print(f"Active Default Provider: {settings.DEFAULT_AI_PROVIDER}")
    print(f"Gemini Model: {settings.GEMINI_MODEL}")
    print("===========================================================")

    clean_data()
    init_superadmin()
    client = TestClient(app)

    # 1. Test Provider Factory Abstraction
    print("\n--- 1. TESTING PROVIDER FACTORY & ABSTRACTION ---")
    default_p = get_ai_provider()
    assert isinstance(default_p, GeminiAIProvider), f"Expected GeminiAIProvider, got: {type(default_p)}"
    print("[PASS] get_ai_provider() returned GeminiAIProvider as default.")

    gemini_p = get_ai_provider("gemini")
    assert isinstance(gemini_p, GeminiAIProvider)
    print("[PASS] get_ai_provider('gemini') returned GeminiAIProvider.")

    claude_p = get_ai_provider("claude")
    assert isinstance(claude_p, ClaudeAIProvider)
    print("[PASS] get_ai_provider('claude') returned ClaudeAIProvider.")

    # 2. Test Real Gemini SDK Requests (Direct Provider Calls)
    print("\n--- 2. TESTING DIRECT REAL GEMINI AI REQUESTS ---")
    
    # 2a. Course Generation with Real Gemini
    print("Calling Gemini generate_course_structure()...")
    course_data = default_p.generate_course_structure(
        course_name="Introduction to Quantum Algorithms",
        grade="Grade 12",
        subject="Computer Science",
        language="English",
        difficulty="Advanced",
        objectives="Understand qubits, superposition, and quantum gates",
        number_of_modules=2,
        lesson_duration="45 mins",
        additional_instructions="Include practical exercises."
    )
    assert isinstance(course_data, dict), f"Expected dict, got {type(course_data)}"
    assert "title" in course_data or "name" in course_data
    assert "modules" in course_data and len(course_data["modules"]) >= 1
    first_module = course_data["modules"][0]
    assert "lessons" in first_module and len(first_module["lessons"]) >= 1
    print(f"[PASS] Real Gemini Course Structure Generated: '{course_data.get('title')}' with {len(course_data['modules'])} modules.")

    # 2b. Assignment Generation with Real Gemini
    print("Calling Gemini generate_assignment()...")
    assignment_data = default_p.generate_assignment(
        topic="Superposition & Hadamard Gates",
        grade_level="Grade 12",
        instructions="Include 3 theoretical questions and 1 matrix calculation."
    )
    assert isinstance(assignment_data, dict)
    assert "title" in assignment_data
    assert "description" in assignment_data
    print(f"[PASS] Real Gemini Assignment Generated: '{assignment_data['title']}' | Max Points: {assignment_data.get('max_points', 100)}")

    # 2c. Tutor Chat with Real Gemini
    print("Calling Gemini tutor_chat()...")
    tutor_reply = default_p.tutor_chat(
        question="What is the difference between a classical bit and a qubit?",
        context_info="Course: Quantum Algorithms, Lesson: 1.1 Qubit Foundations",
        history=[
            {"role": "user", "content": "Hi, I am starting quantum physics today."},
            {"role": "assistant", "content": "Welcome! I am excited to help you explore quantum concepts."}
        ]
    )
    assert isinstance(tutor_reply, str) and len(tutor_reply) > 20
    print(f"[PASS] Real Gemini AI Tutor Response received: {tutor_reply[:120]}...")

    # 3. Super Admin & School Setup with Provider Configurations
    print("\n--- 3. TESTING MULTI-SCHOOL PROVIDER INDEPENDENCE (HTTP API) ---")
    res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert res.status_code == 200
    sa_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # School A: uses Gemini (active)
    res = client.post("/api/v1/super-admin/schools", json={
        "name": "Nova Science Academy",
        "domain": "nova.edu",
        "admin_email": "admin@nova.edu",
        "admin_name": "Nova Admin",
        "admin_password": "AdminPass123!",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res.status_code == 200
    school_a = res.json()
    school_a_id = school_a["id"]
    print(f"[PASS] School A created with AI Provider 'gemini': {school_a['name']}")

    # School B: uses Claude (independent configuration)
    res = client.post("/api/v1/super-admin/schools", json={
        "name": "Horizon Tech Institute",
        "domain": "horizon.edu",
        "admin_email": "admin@horizon.edu",
        "admin_name": "Horizon Admin",
        "admin_password": "AdminPass123!",
        "ai_provider": "claude"
    }, headers=sa_headers)
    assert res.status_code == 200
    school_b = res.json()
    school_b_id = school_b["id"]
    print(f"[PASS] School B created with AI Provider 'claude': {school_b['name']}")

    # 4. School A Teacher Login & Real AI Endpoints
    print("\n--- 4. TESTING LIVE AI HTTP ENDPOINTS FOR SCHOOL A (GEMINI) ---")
    # Create Teacher in School A
    res = client.post("/api/v1/auth/login", json={"email": "admin@nova.edu", "password": "AdminPass123!"})
    assert res.status_code == 200
    admin_a_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Dr. Sarah Lin",
        "email": "sarah.lin@nova.edu",
        "password": "TeacherPass123!"
    }, headers=admin_a_headers)
    assert res.status_code == 200

    # Teacher A Login
    res = client.post("/api/v1/auth/login", json={"email": "sarah.lin@nova.edu", "password": "TeacherPass123!"})
    assert res.status_code == 200
    teacher_a_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # Test HTTP: POST /api/v1/ai/generate-course
    res = client.post("/api/v1/ai/generate-course", json={
        "course_name": "Astrophysics and Dark Matter",
        "grade": "Grade 11",
        "subject": "Physics",
        "language": "English",
        "difficulty": "Advanced",
        "number_of_modules": 2
    }, headers=teacher_a_headers)
    assert res.status_code == 200, f"HTTP AI generate-course failed: {res.text}"
    api_course = res.json()
    assert "title" in api_course or "name" in api_course
    print(f"[PASS] HTTP POST /api/v1/ai/generate-course SUCCESS: '{api_course.get('title')}'")

    # Test HTTP: POST /api/v1/ai/generate-assignment
    res = client.post("/api/v1/ai/generate-assignment", json={
        "topic": "Gravitational Lensing",
        "grade_level": "Grade 11",
        "instructions": "Describe Einstein rings and calculate deflection angle."
    }, headers=teacher_a_headers)
    assert res.status_code == 200, f"HTTP AI generate-assignment failed: {res.text}"
    api_assignment = res.json()
    assert "title" in api_assignment
    print(f"[PASS] HTTP POST /api/v1/ai/generate-assignment SUCCESS: '{api_assignment['title']}'")

    # Test HTTP: POST /api/v1/ai/generate-course-from-pdf with real in-memory PDF
    pdf_writer = PdfWriter()
    page = pdf_writer.add_blank_page(width=72, height=72)
    pdf_bytes_io = io.BytesIO()
    pdf_writer.write(pdf_bytes_io)
    pdf_bytes = pdf_bytes_io.getvalue()

    res = client.post(
        "/api/v1/ai/generate-course-from-pdf",
        files={"file": ("dark_matter_notes.pdf", pdf_bytes, "application/pdf")},
        headers=teacher_a_headers
    )
    assert res.status_code == 200, f"HTTP PDF Course generation failed: {res.text}"
    pdf_course = res.json()
    assert "title" in pdf_course or "name" in pdf_course
    print(f"[PASS] HTTP POST /api/v1/ai/generate-course-from-pdf SUCCESS: '{pdf_course.get('title')}'")

    # Test HTTP: POST /api/v1/ai/tutor-chat
    res = client.post("/api/v1/ai/tutor-chat", json={
        "question": "How do rotation curves provide evidence for dark matter?",
        "course_id": "course-123",
        "lesson_id": "lesson-456"
    }, headers=teacher_a_headers)
    assert res.status_code == 200, f"HTTP Tutor chat failed: {res.text}"
    tutor_data = res.json()
    assert "reply" in tutor_data and len(tutor_data["reply"]) > 10
    print(f"[PASS] HTTP POST /api/v1/ai/tutor-chat SUCCESS: {tutor_data['reply'][:100]}...")

    # 5. Test School B (Claude configuration independence)
    print("\n--- 5. TESTING SCHOOL B (CLAUDE INDEPENDENT PROVIDER) ---")
    res = client.post("/api/v1/auth/login", json={"email": "admin@horizon.edu", "password": "AdminPass123!"})
    assert res.status_code == 200
    admin_b_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Dr. Marcus Bell",
        "email": "marcus.bell@horizon.edu",
        "password": "TeacherPass123!"
    }, headers=admin_b_headers)
    assert res.status_code == 200

    res = client.post("/api/v1/auth/login", json={"email": "marcus.bell@horizon.edu", "password": "TeacherPass123!"})
    assert res.status_code == 200
    teacher_b_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # School B uses Claude -> Since CLAUDE_API_KEY is placeholder/unconfigured, returns 503 for School B
    res = client.post("/api/v1/ai/generate-course", json={
        "course_name": "Horizon Classical Mechanics",
        "grade": "Grade 10",
        "subject": "Physics"
    }, headers=teacher_b_headers)
    assert res.status_code == 503
    assert "Anthropic Claude API key" in res.json()["detail"]
    print("[PASS] School B (Claude) cleanly signals 503 without affecting School A (Gemini)!")

    # 6. Database Cleanup
    print("\n--- 6. POST-TEST DATABASE CLEANUP ---")
    clean_data()
    db = SessionLocal()
    schools_remaining = db.query(School).count()
    courses_remaining = db.query(Course).count()
    users_remaining = db.query(User).count()
    db.close()
    print(f"[PASS] Database Cleaned. Schools: {schools_remaining}, Courses: {courses_remaining}, Users: {users_remaining} (SuperAdmin bootstrap ready)")

    print("\n===========================================================")
    print("ALL REAL GEMINI AI & MULTI-PROVIDER TESTS PASSED 100%!")
    print("===========================================================\n")

if __name__ == "__main__":
    run_tests()
