import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app, init_superadmin
from app.core.config import settings

def test_golden_template_rich_content():
    init_superadmin()
    client = TestClient(app)

    print("==================================================")
    print("TESTING GOLDEN TEMPLATE CONTENT GENERATION & ADOPTION")
    print("==================================================")

    # 1. Super Admin Login
    res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert res.status_code == 200
    sa_token = res.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] SuperAdmin logged in.")

    # 2. Super Admin creates Golden Template without passing manual modules
    print("Creating Golden Template via POST /api/v1/super-admin/golden-templates ...")
    res = client.post("/api/v1/super-admin/golden-templates", json={
        "title": "Artificial Intelligence and Ethics Masterclass",
        "description": "Standard platform curriculum on modern AI concepts, societal impacts, and ethical frameworks.",
        "subject": "Computer Science",
        "grade_level": "Grade 11",
        "language": "English",
        "difficulty": "Medium",
        "modules": []  # Empty array triggers rich AI curriculum synthesis
    }, headers=sa_headers)
    assert res.status_code == 200, f"Failed to create golden template: {res.text}"
    template = res.json()
    template_id = template["id"]
    modules = template.get("modules", [])
    total_lessons = sum(len(m.get("lessons", [])) for m in modules)

    print(f"[PASS] Golden Template created: '{template['title']}' (ID: {template_id})")
    print(f"       Modules count: {len(modules)} | Lessons count: {total_lessons}")
    assert len(modules) > 0, "Expected Golden Template to have modules!"
    assert total_lessons > 0, "Expected Golden Template to have lessons!"

    # Verify first lesson has rich content
    first_mod = modules[0]
    first_les = first_mod["lessons"][0]
    print(f"       Sample Module: '{first_mod['title']}'")
    print(f"       Sample Lesson: '{first_les['title']}'")
    print(f"       Content Preview: '{first_les['content'][:80]}...'")
    print(f"       Summary Preview: '{first_les.get('summary', '')[:60]}...'")
    assert len(first_les["content"]) > 20, "Lesson content must not be empty!"

    # 3. Create a School & Teacher to adopt the Golden Template
    import uuid
    uid = uuid.uuid4().hex[:6]
    res = client.post("/api/v1/super-admin/schools", json={
        "name": f"Beacon High {uid}",
        "domain": f"beacon-{uid}.edu",
        "admin_email": f"admin@{uid}.edu",
        "admin_name": "Beacon Admin",
        "admin_password": "SchoolPassword2026!",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res.status_code == 200
    school = res.json()
    school_id = school["id"]

    res = client.post("/api/v1/auth/login", json={
        "email": f"admin@{uid}.edu",
        "password": "SchoolPassword2026!"
    })
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Ms. Clara Oswald",
        "email": f"clara@{uid}.edu",
        "password": "TeacherPassword2026!",
        "subject": "Computer Science"
    }, headers=admin_headers)
    assert res.status_code == 200

    # 4. Teacher Logs In and Adopts the Golden Template
    res = client.post("/api/v1/auth/login", json={
        "email": f"clara@{uid}.edu",
        "password": "TeacherPassword2026!"
    })
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    print("Teacher adopting Golden Template via POST /api/v1/teacher/adopt-template/{id} ...")
    res = client.post(f"/api/v1/teacher/adopt-template/{template_id}", headers=teacher_headers)
    assert res.status_code == 200, f"Adoption failed: {res.text}"
    adopted_course = res.json()
    adopted_modules = adopted_course.get("modules", [])
    adopted_lessons_count = sum(len(m.get("lessons", [])) for m in adopted_modules)

    print(f"[PASS] Golden Template adopted by school!")
    print(f"       Adopted Course Title: '{adopted_course['title']}' (ID: {adopted_course['id']})")
    print(f"       School ID: {adopted_course.get('schoolId') or adopted_course.get('school_id')}")
    print(f"       Adopted Modules: {len(adopted_modules)} | Adopted Lessons: {adopted_lessons_count}")
    assert len(adopted_modules) == len(modules), "Adopted course must have all modules from Golden Template!"
    assert adopted_lessons_count == total_lessons, "Adopted course must have all lessons from Golden Template!"

    # Verify content in adopted lesson
    adopted_first_les = adopted_modules[0]["lessons"][0]
    assert len(adopted_first_les["content"]) > 20, "Adopted lesson must retain rich content!"
    print(f"       Adopted Lesson Content Verified: '{adopted_first_les['content'][:80]}...'")

    # 5. Clean up test data
    from app.core.database import SessionLocal
    from app.models.course import Course
    db = SessionLocal()
    db.query(Course).filter(Course.id == template_id).delete()
    db.commit()
    db.close()
    client.delete(f"/api/v1/super-admin/schools/{school_id}", headers=sa_headers)
    print(f"[PASS] Cleaned up test school & golden template.")
    print("==================================================")
    print("GOLDEN TEMPLATE CONTENT & ADOPTION VERIFIED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_golden_template_rich_content()
