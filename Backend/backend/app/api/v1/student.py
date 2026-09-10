import json
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.models.course import Course, Lesson, Module
from app.models.lms import Enrollment, LessonProgress, Assignment, Submission, StudentStats, EvaluationGame, GameResult
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.services.challenge_service import record_challenge_progress
from app.services.notification_service import create_notification
from app.schemas.course import CourseResponse
from app.schemas.lms import AssignmentResponse, SubmissionCreate, SubmissionResponse
from app.models.lesson_note import LessonNote
from app.schemas.lesson_note import LessonNoteUpsert, LessonNoteResponse

router = APIRouter(dependencies=[Depends(require_roles([UserRole.STUDENT]))])


def get_module_lock_status(db: Session, module: Module, student_id: str):
    """
    Shared lock-status helper used both when rendering a course's modules to a
    student (preview -- shows *why* a module is locked) and when actually
    enforcing the lock on lesson completion. Checks scheduled release first,
    then prerequisite completion, per module. Returns
    (is_locked: bool, lock_reason: Optional[str], unlocks_at: Optional[datetime]).
    """
    now = datetime.now(timezone.utc)

    if module.publish_at is not None:
        publish_at = module.publish_at
        if publish_at.tzinfo is None:
            publish_at = publish_at.replace(tzinfo=timezone.utc)
        if publish_at > now:
            return True, "scheduled", module.publish_at

    if module.prerequisite_module_id:
        prereq = db.query(Module).filter(Module.id == module.prerequisite_module_id).first()
        if prereq:
            prereq_lesson_ids = [l.id for l in prereq.lessons]
            if prereq_lesson_ids:
                completed_count = db.query(LessonProgress).filter(
                    LessonProgress.student_id == student_id,
                    LessonProgress.lesson_id.in_(prereq_lesson_ids),
                    LessonProgress.is_completed == True
                ).count()
                if completed_count < len(prereq_lesson_ids):
                    return True, "prerequisite", None

    return False, None, None

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

    # Annotate each module with lock metadata for this student. Modules are never
    # hidden entirely (a student can see "Module 3 unlocks Nov 1" as a preview) --
    # these are just extra, non-persisted attributes read by ModuleResponse.
    for module in course.modules:
        is_locked, lock_reason, unlocks_at = get_module_lock_status(db, module, current_user.id)
        module.is_locked = is_locked
        module.lock_reason = lock_reason
        module.unlocks_at = unlocks_at

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

    is_locked, _lock_reason, _unlocks_at = get_module_lock_status(db, lesson.module, current_user.id)
    if is_locked:
        raise HTTPException(status_code=403, detail="Module is not yet unlocked")

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


@router.get("/assignments")
def get_student_assignments(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.school_id == school_id).all()
    course_ids = [e.course_id for e in enrollments]
    if not course_ids:
        return []

    assignments = db.query(Assignment).filter(
        Assignment.school_id == school_id,
        Assignment.course_id.in_(course_ids)
    ).all()

    results = []
    now = datetime.now(timezone.utc)
    for a in assignments:
        course = db.query(Course).filter(Course.id == a.course_id).first()
        submission = db.query(Submission).filter(
            Submission.assignment_id == a.id,
            Submission.student_id == current_user.id
        ).first()

        # Compute status
        if submission:
            if submission.grade_points is not None:
                status_str = "Graded"
            else:
                status_str = "Submitted"
        else:
            if a.due_date and a.due_date < now:
                status_str = "Overdue"
            else:
                status_str = "Not Started"

        results.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "courseId": a.course_id,
            "courseName": course.title if course else "Course",
            "dueDate": a.due_date.isoformat() if a.due_date else None,
            "maxPoints": a.max_points or 100,
            "type": getattr(a, "type", None) or "Quiz",
            "config": getattr(a, "config", None),
            "status": status_str,
            "submission": {
                "id": submission.id,
                "content": submission.content,
                "fileUrl": submission.file_url,
                "gradePoints": submission.grade_points,
                "feedback": submission.feedback,
                "submittedAt": submission.submitted_at.isoformat() if submission.submitted_at else None
            } if submission else None
        })

    return results


@router.get("/profile")
def get_student_profile(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    from app.models.school import School
    from app.models.lms import Grade
    school = db.query(School).filter(School.id == school_id).first()
    grade = db.query(Grade).filter(Grade.id == current_user.grade_id).first() if current_user.grade_id else None

    # Academic statistics
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.school_id == school_id).all()
    enrolled_course_ids = [e.course_id for e in enrollments]
    
    total_assignments = db.query(Assignment).filter(Assignment.course_id.in_(enrolled_course_ids)).count() if enrolled_course_ids else 0
    submissions = db.query(Submission).filter(Submission.student_id == current_user.id, Submission.school_id == school_id).all()
    completed_assignments = len(submissions)
    
    graded_subs = [s for s in submissions if s.grade_points is not None]
    avg_score = round(sum(s.grade_points for s in graded_subs) / len(graded_subs), 1) if graded_subs else None

    # Completed lessons
    completed_lessons_count = db.query(LessonProgress).filter(
        LessonProgress.student_id == current_user.id,
        LessonProgress.is_completed == True
    ).count()

    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()

    return {
        "user": {
            "id": current_user.id,
            "studentId": f"STU-{current_user.id[:6].upper()}",
            "fullName": current_user.full_name,
            "email": current_user.email,
            "role": "student",
            "grade": grade.name if grade else "Unassigned",
            "section": current_user.section or "A",
            "schoolName": school.name if school else "School",
            "isActive": current_user.is_active
        },
        "academic": {
            "enrolledCoursesCount": len(enrollments),
            "completedLessonsCount": completed_lessons_count,
            "totalAssignmentsCount": total_assignments,
            "completedAssignmentsCount": completed_assignments,
            "averageScore": avg_score,
            "xp": stats.xp if stats else 0,
            "streakDays": stats.streak_days if stats else 0,
            "badges": stats.badges if stats else []
        }
    }


@router.post("/change-password")
def change_student_password(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.core.security import verify_password, get_password_hash
    current_pass = payload.get("currentPassword") or payload.get("current_password") or ""
    new_pass = payload.get("newPassword") or payload.get("new_password") or ""

    if not current_pass or not new_pass:
        raise HTTPException(status_code=400, detail="Current password and new password are required")

    if not verify_password(current_pass, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(new_pass.strip())
    db.commit()
    return {"message": "Password changed successfully"}


ALLOWED_SUBMISSION_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".heic": "image/heic", ".pdf": "application/pdf",
}
MAX_SUBMISSION_FILE_BYTES = 10 * 1024 * 1024  # 10 MB -- generous for a phone photo of handwritten work


@router.post("/assignments/{assignment_id}/upload")
async def upload_submission_file(
    assignment_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Students often show math/science work on paper -- a plain textbox can't
    capture that. This lets a student attach a photo (or PDF) of their work;
    the returned fileUrl is then passed to POST /assignments/{id}/submit
    exactly like any other submission field.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_SUBMISSION_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPG, PNG, WEBP, HEIC, or PDF file.",
        )

    contents = await file.read()
    if len(contents) > MAX_SUBMISSION_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 10 MB.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "submissions")
    os.makedirs(uploads_dir, exist_ok=True)
    stored_name = f"{current_user.id}_{assignment_id}_{uuid.uuid4().hex}{ext}"
    with open(os.path.join(uploads_dir, stored_name), "wb") as f:
        f.write(contents)

    return {"fileUrl": f"/uploads/submissions/{stored_name}", "fileName": file.filename}


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

    # A real auto-graded quiz is an Assignment of type "Quiz" whose config
    # actually carries a non-empty `questions` list (the same
    # {question, options, correct_index} shape Fun Games uses). Every
    # "Quiz"-type assignment that exists today has config=None, so this only
    # activates for newly-authored real quizzes -- everything else falls
    # through to the existing, unchanged submission logic below.
    questions = None
    if (getattr(assignment, "type", None) == "Quiz") and isinstance(assignment.config, dict):
        q = assignment.config.get("questions")
        if isinstance(q, list) and len(q) > 0:
            questions = q

    if questions is not None:
        # Real auto-graded quiz: one attempt only, server computes the score.
        existing_quiz_submission = db.query(Submission).filter(
            Submission.assignment_id == assignment.id,
            Submission.student_id == current_user.id
        ).first()
        if existing_quiz_submission is not None:
            raise HTTPException(status_code=400, detail="You have already completed this quiz. Only one attempt is allowed.")

        student_answers = payload.answers or []
        correct_count = 0
        for i, q_item in enumerate(questions):
            correct_index = q_item.get("correct_index")
            if correct_index is None:
                correct_index = q_item.get("correctIndex")
            student_answer = student_answers[i] if i < len(student_answers) else None
            if student_answer is not None and student_answer == correct_index:
                correct_count += 1

        max_points = assignment.max_points or 100
        total = len(questions)
        score = round((correct_count / total) * max_points) if total > 0 else 0

        submission = Submission(
            school_id=school_id,
            assignment_id=assignment.id,
            student_id=current_user.id,
            content=json.dumps({"answers": student_answers, "correct": correct_count, "total": total}),
            file_url=None,
            grade_points=float(score),
            feedback=f"Auto-graded: {correct_count}/{total} correct.",
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(submission)

        # Same real hooks the teacher's manual grade_submission endpoint fires
        # -- an auto-graded quiz score must count for challenges and
        # notifications exactly like a teacher-assigned grade does.
        record_challenge_progress(
            db, school_id=school_id, student_id=current_user.id,
            target_type="assignment", target_id=assignment.id, score=score,
        )
        create_notification(
            db, school_id=school_id, user_id=current_user.id,
            type="grade_posted", title="Your quiz was auto-graded",
            message=f"You scored {score}/{max_points} on \"{assignment.title}\".",
            link="/student/assignments",
        )
    else:
        # Existing create-or-update logic, completely unchanged.
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment.id,
            Submission.student_id == current_user.id
        ).first()

        if not submission:
            submission = Submission(
                school_id=school_id,
                assignment_id=assignment.id,
                student_id=current_user.id,
                content=payload.content,
                file_url=payload.file_url,
                submitted_at=datetime.now(timezone.utc)
            )
            db.add(submission)

            # Notify the course's owning teacher, but only on the FIRST submission
            # -- not on every resubmission before grading -- to avoid spamming the
            # teacher on repeated draft saves. Simplification: only notifies
            # course.created_by_id when set; an orphaned course (created_by_id is
            # NULL) notifies no one rather than guessing at every teacher in the
            # school.
            try:
                course = db.query(Course).filter(Course.id == assignment.course_id).first()
                if course and course.created_by_id:
                    create_notification(
                        db, school_id=school_id, user_id=course.created_by_id,
                        type="new_submission", title="New submission received",
                        message=f"{current_user.full_name} submitted \"{assignment.title}\".",
                        link=f"/teacher/assignments/{assignment.id}/submissions",
                    )
            except Exception:
                pass
        else:
            submission.content = payload.content
            submission.file_url = payload.file_url
            submission.submitted_at = datetime.now(timezone.utc)

    # Award XP to student
    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
    if not stats:
        stats = StudentStats(school_id=school_id, student_id=current_user.id, xp=50, streak_days=1, badges=["First Submission"])
        db.add(stats)
    else:
        stats.xp += 50
        stats.last_active_date = datetime.now(timezone.utc)

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

    # Award XP -- get-or-create so a student's first-ever scored activity
    # (if it happens to be a game) doesn't silently lose its XP.
    stats = db.query(StudentStats).filter(StudentStats.student_id == current_user.id).first()
    if not stats:
        stats = StudentStats(school_id=school_id, student_id=current_user.id, xp=0)
        db.add(stats)
    stats.xp += score

    # Wrapper competitions (Challenges) targeting this game, if any, get their
    # own bonus XP/badge on top -- reuses the exact score just recorded above.
    record_challenge_progress(
        db, school_id=school_id, student_id=current_user.id,
        target_type="game", target_id=game.id, score=score,
    )

    db.commit()
    return {"message": "Game result saved", "score": score}


@router.get("/leaderboard")
def get_student_leaderboard(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Returns the top-ranked students (by XP) within the calling student's own
    school, plus the calling student's own rank/xp even when they fall
    outside the top list. Tenant-scoped: only ever ranks students in the
    same school as the caller.
    """
    TOP_N = 10

    rows = (
        db.query(User, StudentStats)
        .outerjoin(StudentStats, StudentStats.student_id == User.id)
        .filter(
            User.school_id == school_id,
            User.role == UserRole.STUDENT,
            User.is_active == True
        )
        .all()
    )

    ranked = sorted(rows, key=lambda row: (row[1].xp if row[1] else 0), reverse=True)

    entries = []
    current_student_entry = None
    for idx, (student, stats) in enumerate(ranked, start=1):
        entry = {
            "rank": idx,
            "student_id": student.id,
            "full_name": student.full_name,
            "xp": stats.xp if stats else 0,
            "is_current_user": student.id == current_user.id,
        }
        if student.id == current_user.id:
            current_student_entry = entry
        entries.append(entry)

    return {
        "top": entries[:TOP_N],
        "current_student": current_student_entry,
        "total_students": len(entries),
    }

@router.get("/attendance")
def get_my_attendance(
    current_user: User = Depends(get_current_user),
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db),
):
    """
    A student's own attendance across every course they're enrolled in --
    the full record list plus a per-course rate summary, so the frontend
    doesn't have to compute the summary itself.
    """
    course_ids = {
        row[0]
        for row in db.query(Enrollment.course_id)
        .filter(Enrollment.school_id == school_id, Enrollment.student_id == current_user.id)
        .all()
    }
    if not course_ids:
        return {"records": [], "summary": []}

    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()}
    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == current_user.id, AttendanceRecord.course_id.in_(course_ids))
        .order_by(AttendanceRecord.date.desc())
        .all()
    )

    by_course = {}
    for r in records:
        by_course.setdefault(r.course_id, []).append(r)

    summary = []
    for course_id, recs in by_course.items():
        course = courses.get(course_id)
        total = len(recs)
        present = sum(1 for r in recs if r.status == AttendanceStatus.PRESENT)
        late = sum(1 for r in recs if r.status == AttendanceStatus.LATE)
        absent = sum(1 for r in recs if r.status == AttendanceStatus.ABSENT)
        excused = sum(1 for r in recs if r.status == AttendanceStatus.EXCUSED)
        summary.append({
            "course_id": course_id,
            "course_name": course.title if course else "Course",
            "present_count": present,
            "absent_count": absent,
            "late_count": late,
            "excused_count": excused,
            "total_days": total,
            "attendance_rate": round(((present + late) / total) * 100, 1) if total else 0.0,
        })

    return {
        "records": [
            {
                "id": r.id,
                "course_id": r.course_id,
                "course_name": courses[r.course_id].title if r.course_id in courses else "Course",
                "date": r.date.isoformat(),
                "status": r.status.value,
                "notes": r.notes,
            }
            for r in records
        ],
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# In-lesson notes, highlighting, and bookmarking (Task #50). Purely personal
# to the student -- one row per (student, lesson), upserted as a whole on
# every save rather than diffed field-by-field, since this is a lightweight
# personal notepad, not a collaborative document.
# ---------------------------------------------------------------------------
def _get_enrolled_lesson(db: Session, lesson_id: str, school_id: str, student_id: str) -> Lesson:
    lesson = (
        db.query(Lesson)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .filter(Lesson.id == lesson_id, Course.school_id == school_id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    is_enrolled = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == student_id, Enrollment.course_id == lesson.module.course_id)
        .first()
        is not None
    )
    if not is_enrolled:
        raise HTTPException(status_code=403, detail="You are not enrolled in this lesson's course")
    return lesson


def _note_to_response(note: LessonNote) -> LessonNoteResponse:
    return LessonNoteResponse(
        lesson_id=note.lesson_id,
        notes_text=note.notes_text,
        highlights=note.highlights or [],
        is_bookmarked=note.is_bookmarked,
        updated_at=note.updated_at,
    )


@router.get("/lessons/{lesson_id}/notes", response_model=LessonNoteResponse)
def get_lesson_notes(
    lesson_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_enrolled_lesson(db, lesson_id, school_id, current_user.id)
    note = db.query(LessonNote).filter(LessonNote.student_id == current_user.id, LessonNote.lesson_id == lesson_id).first()
    if not note:
        return LessonNoteResponse(lesson_id=lesson_id, notes_text=None, highlights=[], is_bookmarked=False, updated_at=None)
    return _note_to_response(note)


@router.put("/lessons/{lesson_id}/notes", response_model=LessonNoteResponse)
def set_lesson_notes(
    lesson_id: str,
    payload: LessonNoteUpsert,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_enrolled_lesson(db, lesson_id, school_id, current_user.id)
    note = db.query(LessonNote).filter(LessonNote.student_id == current_user.id, LessonNote.lesson_id == lesson_id).first()
    highlights_payload = [h.model_dump() for h in payload.highlights]
    if not note:
        note = LessonNote(
            school_id=school_id, student_id=current_user.id, lesson_id=lesson_id,
            notes_text=payload.notes_text, highlights=highlights_payload, is_bookmarked=payload.is_bookmarked,
        )
        db.add(note)
    else:
        note.notes_text = payload.notes_text
        note.highlights = highlights_payload
        note.is_bookmarked = payload.is_bookmarked
    db.commit()
    db.refresh(note)
    return _note_to_response(note)


@router.get("/bookmarks", response_model=List[LessonNoteResponse])
def list_bookmarked_lessons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notes = db.query(LessonNote).filter(LessonNote.student_id == current_user.id, LessonNote.is_bookmarked.is_(True)).all()
    return [_note_to_response(n) for n in notes]


# ---------------------------------------------------------------------------
# Search across course content (Task #52) -- scoped to the courses the
# student is actually enrolled in.
# ---------------------------------------------------------------------------
@router.get("/search")
def search_course_content_student(
    q: str = "",
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.search_service import search_course_content

    enrolled_course_ids = [
        row[0] for row in db.query(Enrollment.course_id).filter(Enrollment.student_id == current_user.id).all()
    ]
    return search_course_content(db, school_id, enrolled_course_ids, q)


# ---------------------------------------------------------------------------
# Data export & deletion-on-request (Task #61) -- a student's own "right to
# access" copy of everything the platform holds about them, and a way to
# request their account be erased without being able to instantly nuke it
# themselves (a School Admin reviews and fulfills the request).
# ---------------------------------------------------------------------------
@router.get("/me/export-data")
def export_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import json as _json
    from app.services.data_export_service import export_student_data

    data = export_student_data(db, current_user)
    return Response(
        content=_json.dumps(data, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=my-data-export.json"},
    )


@router.post("/me/request-deletion")
def request_my_deletion(
    payload: dict = {},
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.data_request import DataDeletionRequest

    existing = db.query(DataDeletionRequest).filter(
        DataDeletionRequest.student_id == current_user.id,
        DataDeletionRequest.status == "pending",
    ).first()
    if existing:
        return {"message": "A deletion request is already pending review by your school admin.", "id": existing.id}

    request_row = DataDeletionRequest(
        school_id=school_id,
        student_id=current_user.id,
        student_name=current_user.full_name,
        requested_by_id=current_user.id,
        requested_by_role="STUDENT",
        note=(payload or {}).get("note"),
    )
    db.add(request_row)
    db.commit()
    db.refresh(request_row)
    return {"message": "Deletion request submitted. Your school admin will review it.", "id": request_row.id}
