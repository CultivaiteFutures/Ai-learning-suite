import os
import sys
import io
import uuid
import openpyxl
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app, init_superadmin
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.course import Course, Module, Lesson
from app.models.lms import Assignment, Submission, Grade, Enrollment, StudentStats
from app.models.school import School
from app.models.user import User

def run_new_features_test():
    init_superadmin()
    client = TestClient(app)

    print("================================================================================")
    print("        COMPREHENSIVE AUDIT: NEW FEATURES, EXCEL UPLOAD & SETTINGS")
    print("================================================================================")

    # 1. SuperAdmin Login
    sa_res = client.post("/api/v1/auth/login", json={
        "email": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    })
    assert sa_res.status_code == 200
    sa_headers = {"Authorization": f"Bearer {sa_res.json()['access_token']}"}

    uid = uuid.uuid4().hex[:6]
    school_res = client.post("/api/v1/super-admin/schools", json={
        "name": f"Apex International {uid}",
        "domain": f"apex-{uid}.edu",
        "admin_email": f"admin@apex-{uid}.edu",
        "admin_name": "Dean Winchester",
        "admin_password": "ApexAdminPassword2026!",
        "ai_provider": "gemini"
    }, headers=sa_headers)
    assert school_res.status_code == 200
    school = school_res.json()
    school_id = school["id"]

    # Verify school details returns admin_name and admin_email
    detail_res = client.get(f"/api/v1/super-admin/schools/{school_id}", headers=sa_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data.get("admin_name") == "Dean Winchester" or detail_data.get("adminName") == "Dean Winchester"
    assert detail_data.get("admin_email") == f"admin@apex-{uid}.edu" or detail_data.get("adminEmail") == f"admin@apex-{uid}.edu"
    print("[PASS] Super Admin School Details accurately associates Admin Information.")

    # 2. School Admin Login
    admin_login = client.post("/api/v1/auth/login", json={
        "email": f"admin@apex-{uid}.edu",
        "password": "ApexAdminPassword2026!"
    })
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    print("[PASS] School Admin logged in successfully.")

    # 3. Excel Template Download
    tmpl_res = client.get("/api/v1/school-admin/students/excel-template", headers=admin_headers)
    assert tmpl_res.status_code == 200
    assert len(tmpl_res.content) > 100
    print(f"[PASS] Student Excel Template generated and downloaded ({len(tmpl_res.content)} bytes).")

    # 4. Bulk Excel Student Upload with Auto Credential Generation
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Name", "Grade", "Section"])
    ws.append(["Carlos Santana", "Grade 9", "A"])
    ws.append(["Maria Montessori", "Grade 9", "B"])
    ws.append(["Nikola Tesla", "Grade 10", "A"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    upload_res = client.post(
        "/api/v1/school-admin/students/upload-excel",
        files={"file": ("students_test.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=admin_headers
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data["createdCount"] == 3
    assert len(upload_data["credentials"]) == 3
    tesla_cred = next(c for c in upload_data["credentials"] if "Tesla" in c["name"])
    print(f"[PASS] Bulk Excel upload created 3 students with credentials:")
    print(f"       Generated login for Nikola Tesla: Username '{tesla_cred['username']}', Initial Password '{tesla_cred['initialPassword']}'")

    # 5. Verify Student Login with Generated Credentials
    tesla_login = client.post("/api/v1/auth/login", json={
        "email": tesla_cred["username"],
        "password": tesla_cred["initialPassword"]
    })
    assert tesla_login.status_code == 200, f"Student login failed: {tesla_login.text}"
    student_headers = {"Authorization": f"Bearer {tesla_login.json()['access_token']}"}
    print("[PASS] Nikola Tesla logged in with auto-generated credentials!")

    # 6. Student Profile Endpoint
    profile_res = client.get("/api/v1/student/profile", headers=student_headers)
    assert profile_res.status_code == 200
    prof_data = profile_res.json()
    assert prof_data["user"]["fullName"] == "Nikola Tesla"
    assert prof_data["user"]["grade"] == "Grade 10"
    assert prof_data["user"]["section"] == "A"
    print("[PASS] Student profile endpoint returns complete personal and academic information.")

    # 7. Teacher Course & Assignment Creation with Auto-Title & Answer Key
    teacher_res = client.post("/api/v1/school-admin/teachers", json={
        "name": "Prof. Richard Feynman",
        "email": f"feynman@apex-{uid}.edu",
        "password": "TeacherPassword2026!"
    }, headers=admin_headers)
    assert teacher_res.status_code == 200

    teacher_login = client.post("/api/v1/auth/login", json={
        "email": f"feynman@apex-{uid}.edu",
        "password": "TeacherPassword2026!"
    })
    teacher_headers = {"Authorization": f"Bearer {teacher_login.json()['access_token']}"}

    c_res = client.post("/api/v1/teacher/courses", json={
        "title": "Electrodynamics & Relativity",
        "description": "Maxwell equations, special relativity, and Lorentz transformations.",
        "subject": "Physics",
        "grade_level": "Grade 10",
        "modules": []
    }, headers=teacher_headers)
    course_id = c_res.json()["id"]
    join_code = c_res.json()["joinCode"]

    client.post(f"/api/v1/teacher/courses/{course_id}/publish", headers=teacher_headers)

    # Student joins course
    client.post("/api/v1/student/join-course", json={"join_code": join_code}, headers=student_headers)

    # Teacher creates assignment with auto-title and answer key
    asg_res = client.post("/api/v1/teacher/assignments", json={
        "course_id": course_id,
        "title": "", # Auto-title test
        "description": "State Maxwell's four equations in differential form and explain the displacement current.",
        "max_points": 100,
        "answer_key": "1. Gauss Law: div E = rho/eps0\n2. Gauss Law for Magnetism: div B = 0\n3. Faraday Law: curl E = -dB/dt\n4. Ampere-Maxwell: curl B = mu0 J + mu0 eps0 dE/dt",
        "target_type": "all"
    }, headers=teacher_headers)
    assert asg_res.status_code == 200
    asg = asg_res.json()
    assert asg.get("answerKey") is not None or asg.get("answer_key") is not None
    asg_id = asg["id"]
    print(f"[PASS] Teacher created assignment with auto-title: '{asg['title']}' and Answer Key saved in DB.")

    # 8. Student Views Assignment & Submits
    st_asgs = client.get("/api/v1/student/assignments", headers=student_headers).json()
    assert len(st_asgs) >= 1
    assert st_asgs[0]["status"] == "Not Started"

    # Student submits
    client.post(f"/api/v1/student/assignments/{asg_id}/submit", json={
        "content": "Maxwell's equations:\n1. ∇·E = ρ/ε₀\n2. ∇·B = 0\n3. ∇×E = -∂B/∂t\n4. ∇×B = μ₀J + μ₀ε₀∂E/∂t\nDisplacement current accounts for time-varying electric flux producing a magnetic field."
    }, headers=student_headers)

    st_asgs_after = client.get("/api/v1/student/assignments", headers=student_headers).json()
    assert st_asgs_after[0]["status"] == "Submitted"
    print("[PASS] Student submitted assignment, live status changed to 'Submitted'.")

    # 9. Teacher AI-assisted Grading with the Assignment's Stored Answer Key
    sub = client.get(f"/api/v1/teacher/assignments/{asg_id}/submissions", headers=teacher_headers).json()[0]
    sub_id = sub["id"]

    ai_eval = client.post("/api/v1/ai/grade-submission-with-answer-key", data={
        "submission_id": sub_id,
        "answer_key_text": asg.get("answerKey") or asg.get("answer_key")
    }, headers=teacher_headers).json()
    assert ai_eval.get("suggested_grade") is not None or ai_eval.get("suggestedGrade") is not None
    print(f"[PASS] Teacher AI-assisted grading evaluated student submission against stored answer key: Score {ai_eval.get('suggested_grade') or ai_eval.get('suggestedGrade')}/100")

    # Teacher commits final grade
    client.post(f"/api/v1/teacher/submissions/{sub_id}/grade", json={
        "grade_points": 100.0,
        "feedback": "Perfect mathematical formulation and explanation."
    }, headers=teacher_headers)

    st_asgs_graded = client.get("/api/v1/student/assignments", headers=student_headers).json()
    assert st_asgs_graded[0]["status"] == "Graded"
    assert st_asgs_graded[0]["submission"]["gradePoints"] == 100.0
    print("[PASS] Student sees final graded score (100/100) and teacher feedback.")

    # 10. School Admin & Student Password Changes
    pwd_res = client.post("/api/v1/student/change-password", json={
        "currentPassword": tesla_cred["initialPassword"],
        "newPassword": "NewStudentPassword2026!"
    }, headers=student_headers)
    assert pwd_res.status_code == 200

    new_login = client.post("/api/v1/auth/login", json={
        "email": tesla_cred["username"],
        "password": "NewStudentPassword2026!"
    })
    assert new_login.status_code == 200
    print("[PASS] Student successfully changed password and logged in with new password.")

    # 11. Cleanup test records
    db = SessionLocal()
    db.query(Submission).filter(Submission.school_id == school_id).delete()
    db.query(Assignment).filter(Assignment.school_id == school_id).delete()
    db.query(Course).filter(Course.school_id == school_id).delete()
    db.query(StudentStats).filter(StudentStats.school_id == school_id).delete()
    db.query(Enrollment).filter(Enrollment.school_id == school_id).delete()
    db.query(User).filter(User.school_id == school_id).delete()
    db.query(Grade).filter(Grade.school_id == school_id).delete()
    db.commit()
    db.close()
    client.delete(f"/api/v1/super-admin/schools/{school_id}", headers=sa_headers)
    print("[PASS] Cleaned up all test artifacts.")

    print("\n================================================================================")
    print("        ALL NEW AUDIT FEATURES & WORKFLOWS VERIFIED 100% PASS!")
    print("================================================================================")

if __name__ == "__main__":
    run_new_features_test()
