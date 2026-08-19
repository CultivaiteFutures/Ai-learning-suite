from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, UserRole
from app.models.school import School
from app.models.platform import Subscription, ActivityLog
from app.models.course import Course, Module, Lesson
from app.core.security import get_password_hash
from app.schemas.school import SchoolCreate, SchoolResponse, SchoolUpdate
from app.schemas.course import CourseCreate, CourseResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.SUPER_ADMIN]))])

@router.post("/schools", response_model=SchoolResponse)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db), admin: User = Depends(require_roles([UserRole.SUPER_ADMIN]))):
    school = School(
        name=payload.name,
        domain=payload.domain,
        ai_provider=payload.ai_provider or "gemini"
    )
    db.add(school)
    db.commit()
    db.refresh(school)

    # Subscription
    sub = Subscription(school_id=school.id, plan=payload.plan or "Professional", status="active")
    db.add(sub)

    # Optional Admin Creation
    if payload.admin_email and payload.admin_password:
        admin_user = User(
            email=payload.admin_email,
            hashed_password=get_password_hash(payload.admin_password),
            full_name=payload.admin_name or f"{school.name} Admin",
            role=UserRole.ADMIN,
            school_id=school.id
        )
        db.add(admin_user)

    # Log Activity
    log = ActivityLog(user_id=admin.id, user_name=admin.full_name, action="SCHOOL_CREATED", details=f"Created school: {school.name}")
    db.add(log)

    db.commit()
    db.refresh(school)
    return school


@router.get("/schools", response_model=List[SchoolResponse])
def get_all_schools(db: Session = Depends(get_db)):
    schools = db.query(School).all()
    for s in schools:
        s.student_count = db.query(User).filter(User.school_id == s.id, User.role == UserRole.STUDENT).count()
        s.teacher_count = db.query(User).filter(User.school_id == s.id, User.role == UserRole.TEACHER).count()
        s.course_count = db.query(Course).filter(Course.school_id == s.id).count()
        sub = db.query(Subscription).filter(Subscription.school_id == s.id).first()
        s.subscription_plan = sub.plan if sub else "Professional"
    return schools


@router.get("/schools/{school_id}", response_model=SchoolResponse)
def get_school_by_id(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.student_count = db.query(User).filter(User.school_id == school.id, User.role == UserRole.STUDENT).count()
    school.teacher_count = db.query(User).filter(User.school_id == school.id, User.role == UserRole.TEACHER).count()
    school.course_count = db.query(Course).filter(Course.school_id == school.id).count()
    sub = db.query(Subscription).filter(Subscription.school_id == school.id).first()
    school.subscription_plan = sub.plan if sub else "Professional"
    return school


@router.put("/schools/{school_id}", response_model=SchoolResponse)
def update_school(school_id: str, payload: SchoolUpdate, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    if payload.name is not None:
        school.name = payload.name
    if payload.domain is not None:
        school.domain = payload.domain
    if payload.is_active is not None:
        school.is_active = payload.is_active
    if payload.ai_provider is not None:
        school.ai_provider = payload.ai_provider

    # Update or create School Admin user credentials if provided
    admin_user = db.query(User).filter(User.school_id == school.id, User.role == UserRole.ADMIN).first()
    if admin_user:
        if payload.admin_email:
            admin_user.email = payload.admin_email
        if payload.admin_name:
            admin_user.full_name = payload.admin_name
        if payload.admin_password and payload.admin_password.strip():
            admin_user.hashed_password = get_password_hash(payload.admin_password.strip())
    elif payload.admin_email and payload.admin_password:
        admin_user = User(
            email=payload.admin_email,
            hashed_password=get_password_hash(payload.admin_password.strip()),
            full_name=payload.admin_name or f"{school.name} Admin",
            role=UserRole.ADMIN,
            school_id=school.id
        )
        db.add(admin_user)

    # Update subscription plan if provided
    if payload.plan:
        sub = db.query(Subscription).filter(Subscription.school_id == school.id).first()
        if sub:
            sub.plan = payload.plan
        else:
            db.add(Subscription(school_id=school.id, plan=payload.plan, status="active"))

    db.commit()
    db.refresh(school)
    return school


@router.post("/schools/{school_id}/suspend")
def suspend_school(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.is_active = False
    db.commit()
    return {"message": "School suspended", "id": school_id, "status": "suspended"}


@router.post("/schools/{school_id}/activate")
def activate_school(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.is_active = True
    db.commit()
    return {"message": "School activated", "id": school_id, "status": "active"}


@router.delete("/schools/{school_id}")
def delete_school(school_id: str, db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    db.delete(school)
    db.commit()
    return {"message": "School deleted", "id": school_id}


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    total_schools = db.query(School).count()
    active_schools = db.query(School).filter(School.is_active == True).count()
    total_users = db.query(User).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_courses = db.query(Course).filter(Course.school_id.isnot(None)).count()
    golden_templates = db.query(Course).filter(Course.is_golden_template == True).count()

    return {
        "totalSchools": total_schools,
        "activeSchools": active_schools,
        "inactiveSchools": total_schools - active_schools,
        "totalUsers": total_users,
        "totalTeachers": total_teachers,
        "totalStudents": total_students,
        "totalCourses": total_courses,
        "goldenTemplates": golden_templates
    }


@router.get("/activity-logs")
def get_platform_activity_logs(db: Session = Depends(get_db)):
    return db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(100).all()


@router.get("/golden-templates", response_model=List[CourseResponse])
def get_golden_templates(db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.is_golden_template == True, Course.school_id.is_(None)).all()


@router.post("/golden-templates", response_model=CourseResponse)
def create_golden_template(payload: CourseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN]))):
    """
    Creates platform-level Golden Source Course Template (school_id = NULL).
    Purely manual without unwanted automated background generation.
    """
    course = Course(
        school_id=None,  # Platform Level
        title=payload.title,
        description=payload.description or "",
        subject=payload.subject or "",
        grade_level=payload.grade_level or "",
        language=payload.language or "English",
        difficulty=payload.difficulty or "Medium",
        is_published=True,
        is_golden_template=True,
        created_by_id=current_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    for m_idx, m_data in enumerate(payload.modules or []):
        m_title = m_data.title if hasattr(m_data, "title") else (m_data.get("title") or m_data.get("name") or f"Module {m_idx + 1}")
        m_desc = m_data.description if hasattr(m_data, "description") else (m_data.get("description") or "")
        module = Module(course_id=course.id, title=m_title, description=m_desc, order=m_idx)
        db.add(module)
        db.commit()
        db.refresh(module)

        lessons_list = m_data.lessons if hasattr(m_data, "lessons") else m_data.get("lessons", [])
        for l_idx, l_data in enumerate(lessons_list or []):
            l_title = l_data.title if hasattr(l_data, "title") else (l_data.get("title") or l_data.get("name") or f"Lesson {l_idx + 1}")
            l_content = l_data.content if hasattr(l_data, "content") else (l_data.get("content") or "")
            l_summary = l_data.summary if hasattr(l_data, "summary") else (l_data.get("summary") or "")
            l_duration = l_data.duration_minutes if hasattr(l_data, "duration_minutes") else (l_data.get("duration_minutes") or 30)
            l_activities = l_data.activities if hasattr(l_data, "activities") else l_data.get("activities", None)
            l_homework = l_data.homework if hasattr(l_data, "homework") else l_data.get("homework", None)
            l_quiz = l_data.quiz if hasattr(l_data, "quiz") else l_data.get("quiz", None)

            lesson = Lesson(
                module_id=module.id,
                title=l_title,
                content=l_content,
                summary=l_summary,
                duration_minutes=l_duration,
                order=l_idx,
                activities=l_activities,
                homework=l_homework,
                quiz=l_quiz
            )
            db.add(lesson)

    # Activity Log
    log = ActivityLog(user_id=current_user.id, user_name=current_user.full_name, action="GOLDEN_TEMPLATE_CREATED", details=f"Template: {course.title}")
    db.add(log)

    db.commit()
    db.refresh(course)
    return course


@router.get("/subscriptions")
def get_subscriptions(db: Session = Depends(get_db)):
    return db.query(Subscription).all()