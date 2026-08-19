from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.lms import Grade
from app.models.course import Course
from app.models.platform import ActivityLog
from app.core.security import get_password_hash
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.lms import GradeCreate, GradeResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.ADMIN]))])

@router.get("/teachers", response_model=List[UserResponse])
def get_teachers(school_id: str = Depends(get_current_school_id), db: Session = Depends(get_db)):
    return db.query(User).filter(User.school_id == school_id, User.role == UserRole.TEACHER).all()

@router.post("/teachers", response_model=UserResponse)
def create_teacher(
    payload: UserCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teacher = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole.TEACHER,
        school_id=school_id
    )
    db.add(teacher)
    
    log = ActivityLog(school_id=school_id, user_id=current_user.id, user_name=current_user.full_name, action="TEACHER_CREATED", details=f"Teacher: {teacher.full_name}")
    db.add(log)

    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/teachers/{teacher_id}", response_model=UserResponse)
def update_teacher(
    teacher_id: str,
    payload: UserUpdate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    teacher = db.query(User).filter(User.id == teacher_id, User.school_id == school_id, User.role == UserRole.TEACHER).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found or access denied")
    if payload.full_name:
        teacher.full_name = payload.full_name
    if payload.email:
        teacher.email = payload.email
    if payload.is_active is not None:
        teacher.is_active = payload.is_active
    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    teacher = db.query(User).filter(User.id == teacher_id, User.school_id == school_id, User.role == UserRole.TEACHER).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found or access denied")
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher deleted", "id": teacher_id}


@router.get("/students", response_model=List[UserResponse])
def get_students(school_id: str = Depends(get_current_school_id), db: Session = Depends(get_db)):
    return db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).all()

@router.post("/students", response_model=UserResponse)
def create_student(
    payload: UserCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole.STUDENT,
        grade_id=payload.grade_id,
        school_id=school_id
    )
    db.add(student)

    log = ActivityLog(school_id=school_id, user_id=current_user.id, user_name=current_user.full_name, action="STUDENT_CREATED", details=f"Student: {student.full_name}")
    db.add(log)

    db.commit()
    db.refresh(student)
    return student

@router.put("/students/{student_id}", response_model=UserResponse)
def update_student(
    student_id: str,
    payload: UserUpdate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id, User.school_id == school_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or access denied")
    if payload.full_name:
        student.full_name = payload.full_name
    if payload.email:
        student.email = payload.email
    if payload.grade_id:
        student.grade_id = payload.grade_id
    if payload.is_active is not None:
        student.is_active = payload.is_active
    db.commit()
    db.refresh(student)
    return student

@router.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id, User.school_id == school_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or access denied")
    db.delete(student)
    db.commit()
    return {"message": "Student deleted", "id": student_id}


@router.get("/grades", response_model=List[GradeResponse])
def get_grades(school_id: str = Depends(get_current_school_id), db: Session = Depends(get_db)):
    return db.query(Grade).filter(Grade.school_id == school_id).all()

@router.post("/grades", response_model=GradeResponse)
def create_grade(
    payload: GradeCreate,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    grade = Grade(school_id=school_id, name=payload.name, code=payload.code)
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade

@router.delete("/grades/{grade_id}")
def delete_grade(
    grade_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    grade = db.query(Grade).filter(Grade.id == grade_id, Grade.school_id == school_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found or access denied")
    db.delete(grade)
    db.commit()
    return {"message": "Grade deleted", "id": grade_id}


@router.get("/stats")
def get_school_admin_stats(school_id: str = Depends(get_current_school_id), db: Session = Depends(get_db)):
    teachers_count = db.query(User).filter(User.school_id == school_id, User.role == UserRole.TEACHER).count()
    students_count = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).count()
    courses_count = db.query(Course).filter(Course.school_id == school_id).count()
    grades_count = db.query(Grade).filter(Grade.school_id == school_id).count()
    return {
        "teachersCount": teachers_count,
        "studentsCount": students_count,
        "coursesCount": courses_count,
        "gradesCount": grades_count
    }


@router.get("/activity-logs")
def get_school_activity_logs(school_id: str = Depends(get_current_school_id), db: Session = Depends(get_db)):
    return db.query(ActivityLog).filter(ActivityLog.school_id == school_id).order_by(ActivityLog.timestamp.desc()).all()