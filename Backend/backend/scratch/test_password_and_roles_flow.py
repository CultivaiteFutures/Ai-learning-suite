import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app, init_superadmin
from app.core.config import settings

def test_full_role_credentials_flow():
    init_superadmin()
    client = TestClient(app)

    print("==================================================")
    print("TESTING CUSTOM CREDENTIAL CREATION ACROSS ROLES")
    print("==================================================")

    # 1. Super Admin Login
    res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert res.status_code == 200, f"SuperAdmin login failed: {res.text}"
    sa_token = res.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    print("[PASS] SuperAdmin logged in successfully.")

    # 2. Super Admin onboards School with CUSTOM Admin Password
    custom_admin_email = "admin@cambridge-prep.edu"
    custom_admin_pass = "SchoolAdminSecret2026!"
    res = client.post("/api/v1/super-admin/schools", json={
        "name": "Cambridge Prep High",
        "domain": "cambridge-prep.edu",
        "admin_email": custom_admin_email,
        "admin_name": "Dr. Arthur Pendelton",
        "admin_password": custom_admin_pass,
        "plan": "Enterprise",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert res.status_code == 200, f"School creation failed: {res.text}"
    school = res.json()
    school_id = school["id"]
    print(f"[PASS] School onboarded: {school['name']} (ID: {school_id})")

    # 3. School Admin logs in with CUSTOM Admin Password
    res = client.post("/api/v1/auth/login", json={
        "email": custom_admin_email,
        "password": custom_admin_pass
    })
    assert res.status_code == 200, f"SchoolAdmin login failed: {res.text}"
    admin_data = res.json()
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"[PASS] SchoolAdmin login verified with custom password. User: {admin_data['user']['name']}, Role: {admin_data['user']['role']}")

    # 4. School Admin creates Teacher with CUSTOM Teacher Password
    custom_teacher_email = "prof.jones@cambridge-prep.edu"
    custom_teacher_pass = "TeacherPass2026!"
    res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Prof. Indiana Jones",
        "email": custom_teacher_email,
        "password": custom_teacher_pass,
        "subject": "Archaeology"
    }, headers=admin_headers)
    assert res.status_code == 200, f"Teacher creation failed: {res.text}"
    teacher = res.json()
    print(f"[PASS] Teacher created with custom password: {teacher['name']}")

    # 5. Teacher logs in with CUSTOM Teacher Password
    res = client.post("/api/v1/auth/login", json={
        "email": custom_teacher_email,
        "password": custom_teacher_pass
    })
    assert res.status_code == 200, f"Teacher login failed: {res.text}"
    teacher_data = res.json()
    print(f"[PASS] Teacher login verified. User: {teacher_data['user']['name']}, Role: {teacher_data['user']['role']}")

    # 6. School Admin creates Student with CUSTOM Student Password
    custom_student_email = "student.alice@cambridge-prep.edu"
    custom_student_pass = "StudentPass2026!"
    res = client.post("/api/v1/school-admin/students", json={
        "name": "Alice Wonderland",
        "email": custom_student_email,
        "password": custom_student_pass
    }, headers=admin_headers)
    assert res.status_code == 200, f"Student creation failed: {res.text}"
    student = res.json()
    print(f"[PASS] Student created with custom password: {student['name']}")

    # 7. Student logs in with CUSTOM Student Password
    res = client.post("/api/v1/auth/login", json={
        "email": custom_student_email,
        "password": custom_student_pass
    })
    assert res.status_code == 200, f"Student login failed: {res.text}"
    student_data = res.json()
    print(f"[PASS] Student login verified. User: {student_data['user']['name']}, Role: {student_data['user']['role']}")

    # 8. Clean up test school
    client.delete(f"/api/v1/super-admin/schools/{school_id}", headers=sa_headers)
    print(f"[PASS] Cleaned up test school: {school['name']}")
    print("==================================================")
    print("ALL CREDENTIAL CREATION & LOGIN TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_full_role_credentials_flow()
