import os
import sys
import uuid
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app, init_superadmin
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.course import Course

def test_manual_school_and_golden_templates():
    init_superadmin()
    client = TestClient(app)

    print("==================================================")
    print("TESTING MANUAL SCHOOL ONBOARDING & GOLDEN TEMPLATES")
    print("==================================================")

    # 1. Super Admin Login
    res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert res.status_code == 200
    sa_token = res.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] SuperAdmin logged in successfully.")

    # 2. Onboard School with explicit custom password
    uid = uuid.uuid4().hex[:6]
    admin_email = f"principal@{uid}.edu"
    initial_pass = "MySecretAdminPass2026!"
    school_name = f"St. Xavier Academy {uid}"

    print(f"Onboarding school '{school_name}' with password '{initial_pass}'...")
    res = client.post("/api/v1/super-admin/schools", json={
        "name": school_name,
        "domain": f"xavier-{uid}.edu",
        "admin_email": admin_email,
        "admin_name": "Father Francis",
        "admin_password": initial_pass,
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res.status_code == 200, f"School onboarding failed: {res.text}"
    school = res.json()
    school_id = school["id"]
    print(f"[PASS] School onboarded: ID {school_id}")

    # 3. Verify School Admin can log in with custom password
    res = client.post("/api/v1/auth/login", json={
        "email": admin_email,
        "password": initial_pass
    })
    assert res.status_code == 200, f"Login with initial custom password failed: {res.text}"
    print(f"[PASS] School Admin logged in with custom password '{initial_pass}'.")

    # 4. Super Admin Updates School Admin password in Edit School
    new_pass = "UpdatedAdminPassword789!"
    print(f"Updating School Admin password to '{new_pass}'...")
    res = client.put(f"/api/v1/super-admin/schools/{school_id}", json={
        "name": school_name,
        "admin_password": new_pass
    }, headers=sa_headers)
    assert res.status_code == 200, f"Update school failed: {res.text}"

    # 5. Verify School Admin logs in with NEW updated password
    res = client.post("/api/v1/auth/login", json={
        "email": admin_email,
        "password": new_pass
    })
    assert res.status_code == 200, f"Login with updated password failed: {res.text}"
    print(f"[PASS] School Admin logged in with updated password '{new_pass}'.")

    # 6. Verify Golden Template Creation is 100% Manual (NO automatic background lessons)
    print("Creating Golden Template manually with 0 modules...")
    res = client.post("/api/v1/super-admin/golden-templates", json={
        "title": "Manual Geometry Masterclass",
        "description": "Standard curriculum shell ready for manual teacher module authoring.",
        "subject": "Mathematics",
        "grade_level": "Grade 10",
        "language": "English",
        "difficulty": "Medium",
        "modules": []  # Empty -> NO automatic background generation!
    }, headers=sa_headers)
    assert res.status_code == 200, f"Create golden template failed: {res.text}"
    template = res.json()
    template_id = template["id"]
    modules = template.get("modules", [])

    print(f"[PASS] Golden Template created manually: '{template['title']}'")
    print(f"       Modules count: {len(modules)} (Pure manual shell as requested)")
    assert len(modules) == 0, f"Expected 0 auto-generated modules, got {len(modules)}"

    # 7. Clean up test data
    db = SessionLocal()
    db.query(Course).filter(Course.id == template_id).delete()
    db.commit()
    db.close()
    client.delete(f"/api/v1/super-admin/schools/{school_id}", headers=sa_headers)
    print(f"[PASS] Cleaned up test data.")

    print("==================================================")
    print("ALL MANUAL SCHOOL & GOLDEN TEMPLATE TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_manual_school_and_golden_templates()
