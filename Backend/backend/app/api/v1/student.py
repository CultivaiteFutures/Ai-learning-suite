from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course, Lesson, Module
from app.models.lms import Enrollment, LessonProgress, Assignment, Submission, StudentStats, EvaluationGame, GameResult
from app.schemas.course import CourseResponse
from app.schemas.lms import AssignmentResponse, SubmissionCreate, SubmissionResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.STUDENT]))])

@router.get("/enrolled-courses", response_model=List[CourseResponse])
def get_student_enrolled_courses(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.school_id == school_id
    ).all()
    course_ids = [e.course_id for e in enrollments]
    
    if not course_ids:
        return []
    return db.query(Course).filter(Course.id.in_(course_ids), Course.is_published == True).all()


@router.post("/join-course", response_model=CourseResponse)
def join_course(
    payload: dict,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    code = (payload.get("join_code") or payload.get("code") or payload.get("joinCode") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Join code is required")
    
    course = db.query(Course).filter(
        Course.join_code == code,
        Course.school_id == school_id,
        Course.is_published == True
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Invalid join code or course not available in your school")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course.id
    ).first()

    if not existing:
        enrollment = Enrollment(
            school_id=school_id,
            student_id=current_user.id,
            course_id=course.id,
            status="active"
        )
        db.add(enrollment)
        db.commit()
        db.refresh(course)

    return course


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_student_course_detail(
    course_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id, Course.is_published == True).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    return course


@router.post("/lessons/{lesson_id}/complete")
def mark_lesson_complete(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    course = db.query(Course).filter(Course.id == lesson.module.course_id, Course.school_id == school_id, Course.is_published == True).first()
    if not course:
        raise HTTPException(status_code=403, detail="Lesson does not belong to student's school or course not published")

    progress = db.query(LessonProgress).filter(
        LessonProgress.student_id == current_user.id,
        LessonProgress.lesson_id == lesson_id
    ).first()

    if not progress:
        progress = LessonProgress(
            school_id=school_id,
            student_id=current_user.id,
            lesson_id=lesson_id,
            course_id=course.id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc)
        )
        db.add(progress)
    else:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)

    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
    if not stats:
        stats = StudentStats(school_id=school_id, student_id=current_user.id, xp=50, streak_days=1, badges=["First Lesson"])
        db.add(stats)
    else:
        stats.xp += 50
        stats.streak_days += 1
        stats.last_active_date = datetime.now(timezone.utc)

    db.commit()
    return {"message": "Lesson marked complete", "xp": stats.xp, "streak": stats.streak_days}


@router.get("/stats")
def get_student_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
    if not stats:
        return {"xp": 0, "streak_days": 0, "badges": []}
    return {
        "xp": stats.xp,
        "streak_days": stats.streak_days,
        "badges": stats.badges or []
    }


@router.get("/assignments", response_model=List[AssignmentResponse])
def get_student_assignments(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    # Only return assignments for enrolled published courses
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.school_id == school_id).all()
    course_ids = [e.course_id for e in enrollments]
    return db.query(Assignment).filter(Assignment.school_id == school_id, Assignment.course_id.in_(course_ids)).all()


@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionResponse)
def submit_assignment(
    assignment_id: str,
    payload: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")

    submission = Submission(
        school_id=school_id,
        assignment_id=assignment.id,
        student_id=current_user.id,
        content=payload.content,
        file_url=payload.file_url,
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/games")
def get_student_games(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.school_id == school_id).all()
    course_ids = [e.course_id for e in enrollments]
    return db.query(EvaluationGame).filter(EvaluationGame.school_id == school_id, EvaluationGame.course_id.in_(course_ids), EvaluationGame.is_published == True).all()


@router.post("/games/{game_id}/submit")
def submit_game_score(
    game_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    game = db.query(EvaluationGame).filter(EvaluationGame.id == game_id, EvaluationGame.school_id == school_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found or access denied")

    score = int(payload.get("score") or 0)
    result = GameResult(
        school_id=school_id,
        game_id=game.id,
        student_id=current_user.id,
        score=score,
        completed_at=datetime.now(timezone.utc)
    )
    db.add(result)

    # Award XP
    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
    if stats:
        stats.xp += score
    
    db.commit()
    return {"message": "Game result saved", "score": score}