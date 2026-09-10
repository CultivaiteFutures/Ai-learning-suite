from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_school_id, get_current_user
from app.models.user import User, UserRole
from app.services.challenge_service import record_challenge_progress
from app.services.notification_service import create_notification
from app.services.course_ownership import can_manage_course
from app.models.course import Course, Module, Lesson
from app.models.lms import Assignment, Submission, Enrollment, StudentStats, Grade, LessonProgress
from app.models.rubric import Rubric, RubricCriterion
from app.models.course import CourseTeacher
from app.models.platform import ActivityLog
from app.schemas.course import CourseCreate, CourseResponse, ModuleCreate, ModuleResponse, LessonCreate, LessonResponse, CoTeacherAddRequest, CoTeacherResponse
from app.schemas.lms import AssignmentCreate, AssignmentResponse, SubmissionResponse
from app.core.security import get_password_hash

router = APIRouter(dependencies=[Depends(require_roles([UserRole.TEACHER, UserRole.ADMIN]))])

@router.get("/courses", response_model=List[CourseResponse])
def get_teacher_courses(
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Course).filter(Course.school_id == school_id)
    if current_user.role == UserRole.TEACHER:
        # A teacher's "My Courses" list is their own courses, plus any
        # orphaned (no creator recorded) course -- same ownership rule as
        # can_manage_course, so what a teacher can see here always matches
        # what they're actually allowed to edit.
        query = query.filter(or_(Course.created_by_id == current_user.id, Course.created_by_id.is_(None)))
    return query.all()


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course_detail(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    return course


@router.post("/courses", response_model=CourseResponse)
def create_course(
    payload: CourseCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = Course(
        school_id=school_id,
        title=payload.title,
        description=payload.description,
        subject=payload.subject,
        grade_level=payload.grade_level,
        language=payload.language or "English",
        difficulty=payload.difficulty or "Medium",
        is_published=False,
        created_by_id=current_user.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    for m_idx, m_data in enumerate(payload.modules or []):
        # Note: prerequisite_module_id is intentionally not accepted here -- during
        # initial course creation, sibling modules don't have real ids yet for a
        # prerequisite to reference. Set it afterwards via the single-module endpoints.
        module = Module(course_id=course.id, title=m_data.title, description=m_data.description, order=m_idx, publish_at=m_data.publish_at)
        db.add(module)
        db.commit()
        db.refresh(module)

        for l_idx, l_data in enumerate(m_data.lessons or []):
            lesson = Lesson(
                module_id=module.id,
                title=l_data.title,
                content=l_data.content,
                summary=l_data.summary,
                duration_minutes=l_data.duration_minutes,
                order=l_idx,
                activities=l_data.activities,
                homework=l_data.homework,
                quiz=l_data.quiz
            )
            db.add(lesson)

    log = ActivityLog(school_id=school_id, user_id=current_user.id, user_name=current_user.full_name, action="COURSE_CREATED", details=f"Course: {course.title}")
    db.add(log)

    db.commit()
    db.refresh(course)
    return course


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    payload: CourseCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    course.title = payload.title
    course.description = payload.description
    course.subject = payload.subject
    course.grade_level = payload.grade_level
    if payload.language:
        course.language = payload.language
    if payload.difficulty:
        course.difficulty = payload.difficulty

    # Persist modules and lessons if provided in payload
    if payload.modules is not None and len(payload.modules) > 0:
        # Delete existing modules and lessons for this course to ensure clean state matching UI
        for existing_mod in list(course.modules):
            db.delete(existing_mod)
        db.flush()

        for m_idx, m_data in enumerate(payload.modules):
            mod_title = m_data.title or f"Module {m_idx + 1}"
            # Note: prerequisite_module_id is intentionally not carried through this
            # full-replace path -- existing modules are deleted and recreated with fresh
            # ids on every save here, so an old prerequisite id would dangle. Prerequisites
            # are set/edited via the single-module endpoints below instead.
            module = Module(
                course_id=course.id,
                title=mod_title,
                description=m_data.description or "",
                order=m_idx,
                publish_at=m_data.publish_at
            )
            db.add(module)
            db.flush()

            for l_idx, l_data in enumerate(m_data.lessons or []):
                les_title = l_data.title or f"Lesson {l_idx + 1}"
                lesson = Lesson(
                    module_id=module.id,
                    title=les_title,
                    content=l_data.content or "",
                    summary=l_data.summary or "",
                    duration_minutes=l_data.duration_minutes or 30,
                    order=l_idx,
                    activities=l_data.activities,
                    homework=l_data.homework,
                    quiz=l_data.quiz
                )
                db.add(lesson)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}")
def delete_course(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted", "id": course_id}


@router.post("/courses/{course_id}/publish")
def toggle_course_publish(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    course.is_published = not course.is_published

    log = ActivityLog(
        school_id=school_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="COURSE_PUBLISHED" if course.is_published else "COURSE_UNPUBLISHED",
        details=f"Course: {course.title}"
    )
    db.add(log)

    db.commit()
    return {"id": course.id, "is_published": course.is_published, "status": "published" if course.is_published else "draft"}


# MODULE ENDPOINTS
@router.post("/courses/{course_id}/modules", response_model=ModuleResponse)
def add_module(
    course_id: str,
    payload: ModuleCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    prerequisite_module_id = payload.prerequisite_module_id
    if prerequisite_module_id:
        prereq = db.query(Module).filter(Module.id == prerequisite_module_id, Module.course_id == course.id).first()
        if not prereq:
            raise HTTPException(status_code=400, detail="Prerequisite module must belong to the same course")

    max_order = len(course.modules)
    module = Module(
        course_id=course.id,
        title=payload.title,
        description=payload.description,
        order=max_order,
        publish_at=payload.publish_at,
        prerequisite_module_id=prerequisite_module_id
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.put("/courses/{course_id}/modules/{module_id}", response_model=ModuleResponse)
def update_module(
    course_id: str,
    module_id: str,
    payload: ModuleCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    prerequisite_module_id = payload.prerequisite_module_id
    if prerequisite_module_id:
        if prerequisite_module_id == module.id:
            raise HTTPException(status_code=400, detail="A module cannot be its own prerequisite")
        prereq = db.query(Module).filter(Module.id == prerequisite_module_id, Module.course_id == course.id).first()
        if not prereq:
            raise HTTPException(status_code=400, detail="Prerequisite module must belong to the same course")

    module.title = payload.title
    module.description = payload.description
    module.publish_at = payload.publish_at
    module.prerequisite_module_id = prerequisite_module_id
    db.commit()
    db.refresh(module)
    return module


@router.delete("/courses/{course_id}/modules/{module_id}")
def delete_module(
    course_id: str,
    module_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return {"message": "Module deleted", "id": module_id}


# LESSON ENDPOINTS
@router.post("/courses/{course_id}/modules/{module_id}/lessons", response_model=LessonResponse)
def add_lesson(
    course_id: str,
    module_id: str,
    payload: LessonCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    max_order = len(module.lessons)
    lesson = Lesson(
        module_id=module.id,
        title=payload.title,
        content=payload.content,
        summary=payload.summary,
        duration_minutes=payload.duration_minutes or 30,
        order=max_order,
        activities=payload.activities,
        homework=payload.homework,
        quiz=payload.quiz
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.put("/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    payload: LessonCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course.id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.module_id == module.id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson.title = payload.title
    lesson.content = payload.content
    lesson.summary = payload.summary
    if payload.duration_minutes:
        lesson.duration_minutes = payload.duration_minutes
    lesson.activities = payload.activities
    lesson.homework = payload.homework
    lesson.quiz = payload.quiz

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}")
def delete_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.module_id == module_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted", "id": lesson_id}


# ASSIGNMENTS ENDPOINTS
@router.get("/assignments", response_model=List[AssignmentResponse])
def get_teacher_assignments(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    return db.query(Assignment).filter(Assignment.school_id == school_id).all()


def _validate_rubric_ownership(db: Session, rubric_id: Optional[str], school_id: str, current_user: User) -> None:
    """A rubric attached to an assignment must belong to the caller's own
    school AND (unless the caller is Admin) actually be one the caller
    created -- a teacher must never be able to attach another teacher's
    rubric to their own assignment just by guessing its id."""
    if not rubric_id:
        return
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id, Rubric.school_id == school_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    if current_user.role != UserRole.ADMIN and rubric.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this rubric")


@router.post("/assignments", response_model=AssignmentResponse)
def create_assignment(
    payload: AssignmentCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == payload.course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    # Generate auto-title if not provided
    title = payload.title
    if not title or not title.strip():
        if payload.lesson_id:
            lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
            title = f"{lesson.title} — Practice Assignment" if lesson else f"{course.title} — Assignment"
        else:
            title = f"{course.title} — Practice Assignment"

    _validate_rubric_ownership(db, payload.rubric_id, school_id, current_user)

    assignment = Assignment(
        school_id=school_id,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        title=title,
        description=payload.description,
        due_date=payload.due_date,
        max_points=payload.max_points or 100,
        answer_key=payload.answer_key,
        target_type=payload.target_type or "all",
        target_grade=payload.target_grade,
        target_section=payload.target_section,
        type=payload.type or "Quiz",
        config=payload.config,
        rubric_id=payload.rubric_id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/assignments/extract-answer-key-pdf")
async def extract_answer_key_pdf(
    file: UploadFile = File(...),
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teacher uploads Answer Key PDF -> Extracts text & formats into structured answer key rubric
    """
    import io
    import pypdf

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    reader = pypdf.PdfReader(io.BytesIO(contents))
    raw_text = ""
    for page in reader.pages:
        raw_text += page.extract_text() or ""

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded PDF.")

    return {
        "filename": file.filename,
        "answerKey": raw_text.strip()
    }


@router.put("/assignments/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: str,
    payload: AssignmentCreate,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")

    # Ownership is checked against the assignment's ACTUAL current course
    # (assignment.course_id), not payload.course_id -- if the payload is
    # trying to move the assignment to a different course, we still need to
    # confirm the caller was allowed to touch the assignment in the first
    # place, based on where it currently lives.
    current_course = db.query(Course).filter(Course.id == assignment.course_id, Course.school_id == school_id).first()
    if not current_course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, current_course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    if payload.course_id:
        course = db.query(Course).filter(Course.id == payload.course_id, Course.school_id == school_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found or access denied")
        assignment.course_id = payload.course_id

    if payload.title is not None and payload.title.strip():
        assignment.title = payload.title
    if payload.description is not None:
        assignment.description = payload.description
    if payload.lesson_id is not None:
        assignment.lesson_id = payload.lesson_id
    if payload.due_date is not None:
        assignment.due_date = payload.due_date
    if payload.max_points is not None:
        assignment.max_points = payload.max_points
    if payload.answer_key is not None:
        assignment.answer_key = payload.answer_key
    if payload.target_type is not None:
        assignment.target_type = payload.target_type
    if payload.target_grade is not None:
        assignment.target_grade = payload.target_grade
    if payload.target_section is not None:
        assignment.target_section = payload.target_section
    if payload.type is not None:
        assignment.type = payload.type
    if payload.config is not None:
        assignment.config = payload.config
    if payload.rubric_id is not None:
        _validate_rubric_ownership(db, payload.rubric_id, school_id, current_user)
        assignment.rubric_id = payload.rubric_id

    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")
    course = db.query(Course).filter(Course.id == assignment.course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted", "id": assignment_id}


@router.get("/assignments/{assignment_id}/submissions", response_model=List[SubmissionResponse])
def get_assignment_submissions(
    assignment_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or access denied")
    course = db.query(Course).filter(Course.id == assignment.course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")
    return db.query(Submission).filter(Submission.assignment_id == assignment_id, Submission.school_id == school_id).all()


@router.post("/submissions/{submission_id}/grade", response_model=SubmissionResponse)
def grade_submission(
    submission_id: str,
    payload: dict,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == submission_id, Submission.school_id == school_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found or access denied")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id, Assignment.school_id == school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Submission not found or access denied")
    course = db.query(Course).filter(Course.id == assignment.course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Submission not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    grade_points = payload.get("grade_points") or payload.get("gradePoints")
    feedback = payload.get("feedback")
    rubric_scores = payload.get("rubric_scores") or payload.get("rubricScores")

    if rubric_scores is not None:
        if not assignment.rubric_id:
            raise HTTPException(status_code=400, detail="This assignment has no rubric attached")
        criteria = {c.id: c for c in db.query(RubricCriterion).filter(RubricCriterion.rubric_id == assignment.rubric_id).all()}
        if not criteria:
            raise HTTPException(status_code=400, detail="This assignment's rubric has no criteria")

        cleaned_scores = []
        total = 0.0
        for entry in rubric_scores:
            criterion_id = entry.get("criterion_id") or entry.get("criterionId")
            criterion = criteria.get(criterion_id)
            if not criterion:
                raise HTTPException(status_code=400, detail=f"Unknown rubric criterion '{criterion_id}'")
            points = entry.get("points_awarded")
            if points is None:
                points = entry.get("pointsAwarded")
            points = float(points or 0)
            if points < 0 or points > criterion.max_points:
                raise HTTPException(status_code=400, detail=f"Score for '{criterion.title}' must be between 0 and {criterion.max_points}")
            total += points
            cleaned_scores.append({
                "criterion_id": criterion_id,
                "points_awarded": points,
                "comment": entry.get("comment"),
            })

        submission.rubric_scores = cleaned_scores
        # A rubric-graded submission's total is always derived from its
        # criterion scores -- an explicit grade_points in the same payload
        # is ignored rather than silently disagreeing with the rubric math.
        submission.grade_points = round(total, 2)
    elif grade_points is not None:
        submission.grade_points = float(grade_points)

    if feedback is not None:
        submission.feedback = str(feedback)

    log = ActivityLog(
        school_id=school_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        action="SUBMISSION_GRADED",
        details=f"Graded submission for assignment: {submission.assignment_id}"
    )
    db.add(log)

    # Wrapper competitions (Challenges) targeting this assignment, if any,
    # get their leaderboard entry + bonus XP/badge updated off the real grade.
    if grade_points is not None:
        record_challenge_progress(
            db, school_id=school_id, student_id=submission.student_id,
            target_type="assignment", target_id=submission.assignment_id,
            score=int(submission.grade_points),
        )
        try:
            create_notification(
                db, school_id=school_id, user_id=submission.student_id,
                type="grade_posted", title="Your assignment was graded",
                message=f"You received {submission.grade_points} points on \"{assignment.title}\".",
                link="/student/assignments",
            )
        except Exception:
            pass

    db.commit()
    db.refresh(submission)
    return submission




def _owned_course_ids(db: Session, school_id: str, current_user: User) -> Optional[List[str]]:
    """
    None for ADMIN (no restriction -- every course in the school is fair
    game). A concrete list of course ids for TEACHER: their own courses plus
    any orphaned (no recorded creator) course, matching can_manage_course's
    rule everywhere else in this file.
    """
    if current_user.role == UserRole.ADMIN:
        return None
    owned = db.query(Course.id).filter(
        Course.school_id == school_id,
        or_(Course.created_by_id == current_user.id, Course.created_by_id.is_(None)),
    ).all()
    co_taught = db.query(CourseTeacher.course_id).filter(
        CourseTeacher.school_id == school_id, CourseTeacher.teacher_id == current_user.id,
    ).all()
    return list({row[0] for row in owned} | {row[0] for row in co_taught})


@router.get("/students")
def get_teacher_students(
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course_ids = _owned_course_ids(db, school_id, current_user)

    if course_ids is None:
        # ADMIN: every student in the school, same as before.
        students = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).all()
    else:
        # TEACHER: only students actually enrolled in one of this teacher's
        # own courses -- previously this ignored ownership entirely and
        # returned every student in the school regardless of who taught them.
        if not course_ids:
            return []
        student_ids = {
            row[0]
            for row in db.query(Enrollment.student_id)
            .filter(Enrollment.school_id == school_id, Enrollment.course_id.in_(course_ids))
            .distinct()
            .all()
        }
        if not student_ids:
            return []
        students = db.query(User).filter(User.id.in_(student_ids), User.role == UserRole.STUDENT).all()

    result = []
    for st in students:
        stats = db.query(StudentStats).filter(StudentStats.student_id == st.id).first()
        if course_ids is None:
            enroll_count = db.query(Enrollment).filter(Enrollment.student_id == st.id).count()
        else:
            # Only count enrollments in courses this teacher actually teaches,
            # so the "enrolled courses" figure matches what this teacher can see.
            enroll_count = db.query(Enrollment).filter(
                Enrollment.student_id == st.id, Enrollment.course_id.in_(course_ids)
            ).count()
        grade_name = st.grade.name if st.grade else "N/A"
        result.append({
            "id": st.id,
            "name": st.full_name,
            "email": st.email,
            "grade": grade_name,
            "enrolledCourses": enroll_count,
            "xp": stats.xp if stats else 0,
            "streak": stats.streak_days if stats else 0
        })
    return result


@router.get("/courses/{course_id}/students")
def get_course_students(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real per-course roster, sourced from Enrollment records (not a grade-level
    approximation) -- school-scoped and 404s for a wrong/foreign course, same
    as every other course-scoped route in this file. Also enforces
    can_manage_course, same as the write endpoints on this same course --
    previously this had no ownership check at all, so any teacher in the
    school could pull any other teacher's course roster just by knowing (or
    guessing) its id.
    """
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can view this roster")

    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id, Enrollment.school_id == school_id).all()
    result = []
    for enr in enrollments:
        student = db.query(User).filter(User.id == enr.student_id, User.school_id == school_id, User.role == UserRole.STUDENT).first()
        if not student:
            continue
        stats = db.query(StudentStats).filter(StudentStats.student_id == student.id).first()
        grade_name = student.grade.name if student.grade else "N/A"
        result.append({
            "id": student.id,
            "name": student.full_name,
            "email": student.email,
            "grade": grade_name,
            "xp": stats.xp if stats else 0,
            "streak": stats.streak_days if stats else 0,
            "enrolledAt": enr.enrolled_at.isoformat() if enr.enrolled_at else None
        })
    return result


@router.get("/analytics")
def get_teacher_analytics(
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course_ids = _owned_course_ids(db, school_id, current_user)
    courses_query = db.query(Course).filter(Course.school_id == school_id)
    if course_ids is not None:
        courses_query = courses_query.filter(Course.id.in_(course_ids)) if course_ids else courses_query.filter(False)
    courses = courses_query.all()
    total_courses = len(courses)

    assignments_query = db.query(Assignment).filter(Assignment.school_id == school_id)
    submissions_query = db.query(Submission).filter(Submission.school_id == school_id)
    progress_query = db.query(LessonProgress).filter(LessonProgress.school_id == school_id)
    if course_ids is not None:
        ids_filter = course_ids if course_ids else ["__none__"]
        assignments_query = assignments_query.filter(Assignment.course_id.in_(ids_filter))
        submissions_query = submissions_query.join(Assignment, Submission.assignment_id == Assignment.id).filter(Assignment.course_id.in_(ids_filter))
        progress_query = progress_query.filter(LessonProgress.course_id.in_(ids_filter))

    total_assignments = assignments_query.count()
    submissions_count = submissions_query.count()

    if course_ids is None:
        total_students = db.query(User).filter(User.school_id == school_id, User.role == UserRole.STUDENT).count()
    else:
        total_students = (
            db.query(Enrollment.student_id)
            .filter(Enrollment.school_id == school_id, Enrollment.course_id.in_(course_ids if course_ids else ["__none__"]))
            .distinct()
            .count()
        )

    # Real completion-rate computation from LessonProgress rows (no hardcoded placeholder).
    progress_rows = progress_query.all()
    total_progress = len(progress_rows)
    completed_progress = sum(1 for p in progress_rows if p.is_completed)
    average_completion_rate = round((completed_progress / total_progress) * 100, 1) if total_progress > 0 else 0

    # Real per-course enrollment counts, for the "Students per Course" chart --
    # previously the frontend used a client-side field that was hardcoded to 0
    # everywhere it was set and never actually populated from real data.
    students_per_course = []
    for course in courses:
        count = db.query(Enrollment).filter(Enrollment.course_id == course.id, Enrollment.school_id == school_id).count()
        students_per_course.append({"courseName": course.title, "count": count})

    # Real grading-status breakdown, for the "Assignment Status" chart --
    # previously fed by a client-side "status" field that doesn't exist
    # anywhere in the Assignment model, so it was 100% fabricated.
    assignment_ids = [a.id for a in assignments_query.all()]
    graded_count = 0
    awaiting_count = 0
    if assignment_ids:
        subs = db.query(Submission).filter(Submission.assignment_id.in_(assignment_ids)).all()
        graded_count = sum(1 for s in subs if s.grade_points is not None)
        awaiting_count = sum(1 for s in subs if s.grade_points is None)

    return {
        "totalCourses": total_courses,
        "totalStudents": total_students,
        "totalAssignments": total_assignments,
        "submissionsCount": submissions_count,
        "averageCompletionRate": average_completion_rate,
        "studentsPerCourse": students_per_course,
        "gradingBreakdown": {"graded": graded_count, "awaitingGrading": awaiting_count}
    }


@router.get("/grades/export/excel")
def export_grades_excel(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Exports full school gradebook data into a formatted Excel (.xlsx) report from PostgreSQL
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    import io
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Gradebook Report"

    headers = [
        "Student Name", "Student Email", "Grade Level", "Course",
        "Assignment", "Max Points", "Score / Grade", "Percentage",
        "Status", "Teacher Feedback", "Submission Date"
    ]
    ws.append(headers)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    submissions = db.query(Submission).filter(Submission.school_id == school_id).all()
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
        course = db.query(Course).filter(Course.id == assignment.course_id).first() if assignment else None

        st_name = student.full_name if student else "Unknown"
        st_email = student.email if student else "N/A"
        grade_lvl = student.grade.name if (student and student.grade) else "N/A"
        c_title = course.title if course else "N/A"
        a_title = assignment.title if assignment else "N/A"
        max_p = assignment.max_points if assignment else 100.0
        score = s.grade_points if s.grade_points is not None else "Pending"
        pct = f"{(s.grade_points / max_p * 100):.1f}%" if (s.grade_points is not None and max_p) else "N/A"
        status = "Graded" if s.grade_points is not None else "Submitted"
        feedback = s.feedback or ""
        sub_date = s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else "N/A"

        ws.append([st_name, st_email, grade_lvl, c_title, a_title, max_p, score, pct, status, feedback, sub_date])

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=gradebook_report.xlsx"}
    )


@router.get("/grades/export/pdf")
def export_grades_pdf(
    school_id: str = Depends(get_current_school_id),
    db: Session = Depends(get_db)
):
    """
    Exports full school gradebook data into a formatted PDF report from PostgreSQL
    """
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(letter), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1E1B4B"),
        alignment=1
    )

    elements = []
    elements.append(Paragraph("School Gradebook & Assessment Report", title_style))
    elements.append(Spacer(1, 15))

    data = [["Student", "Course", "Assignment", "Max", "Score", "%", "Status", "Feedback"]]

    submissions = db.query(Submission).filter(Submission.school_id == school_id).all()
    for s in submissions:
        student = db.query(User).filter(User.id == s.student_id).first()
        assignment = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
        course = db.query(Course).filter(Course.id == assignment.course_id).first() if assignment else None

        st_name = student.full_name if student else "Unknown"
        c_title = (course.title[:20] + "..") if (course and len(course.title) > 20) else (course.title if course else "N/A")
        a_title = (assignment.title[:20] + "..") if (assignment and len(assignment.title) > 20) else (assignment.title if assignment else "N/A")
        max_p = str(int(assignment.max_points)) if assignment else "100"
        score = str(round(s.grade_points, 1)) if s.grade_points is not None else "-"
        pct = f"{(s.grade_points / assignment.max_points * 100):.0f}%" if (s.grade_points is not None and assignment and assignment.max_points) else "-"
        status = "Graded" if s.grade_points is not None else "Submitted"
        feedback = (s.feedback[:30] + "..") if (s.feedback and len(s.feedback) > 30) else (s.feedback or "-")

        data.append([st_name, c_title, a_title, max_p, score, pct, status, feedback])

    if len(data) == 1:
        data.append(["No records found", "-", "-", "-", "-", "-", "-", "-"])

    t = Table(data, colWidths=[110, 110, 110, 45, 45, 45, 65, 170])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (3, 0), (5, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(t)
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=gradebook_report.pdf"}
    )


# TEACHER SELF-SERVICE SETTINGS ENDPOINTS
@router.put("/settings/profile")
def update_teacher_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if "fullName" in payload and payload["fullName"]:
        current_user.full_name = payload["fullName"]
    elif "full_name" in payload and payload["full_name"]:
        current_user.full_name = payload["full_name"]

    if "email" in payload and payload["email"]:
        current_user.email = payload["email"]

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully", "user": {"id": current_user.id, "fullName": current_user.full_name, "email": current_user.email}}


@router.post("/settings/change-password")
def change_teacher_password(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.core.security import verify_password
    current_pass = payload.get("currentPassword") or payload.get("current_password") or ""
    new_pass = payload.get("newPassword") or payload.get("new_password") or ""

    if not current_pass or not new_pass:
        raise HTTPException(status_code=400, detail="Current password and new password are required")

    if not verify_password(current_pass, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(new_pass.strip())
    db.commit()
    return {"message": "Password changed successfully"}

# ---------------------------------------------------------------------------
# Co-teaching (Task #47): the course's primary owner (created_by_id) or an
# Admin can grant another teacher in the same school the same manage rights
# on a course via a CourseTeacher row. can_manage_course (see
# app/services/course_ownership.py) then treats a co-teacher identically to
# the primary owner everywhere else in the app.
# ---------------------------------------------------------------------------

def _is_primary_owner_or_admin(course: Course, current_user: User) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    return course.created_by_id == current_user.id


@router.get("/courses/{course_id}/co-teachers", response_model=List[CoTeacherResponse])
def list_co_teachers(
    course_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not can_manage_course(db, course, current_user):
        raise HTTPException(status_code=403, detail="Only the course's teacher or a school admin can do this")

    rows = db.query(CourseTeacher).filter(CourseTeacher.course_id == course_id).order_by(CourseTeacher.added_at).all()
    return [
        CoTeacherResponse(id=r.id, teacher_id=r.teacher_id, name=r.teacher.full_name, email=r.teacher.email, added_at=r.added_at)
        for r in rows
        if r.teacher
    ]


@router.post("/courses/{course_id}/co-teachers", response_model=CoTeacherResponse)
def add_co_teacher(
    course_id: str,
    payload: CoTeacherAddRequest,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not _is_primary_owner_or_admin(course, current_user):
        raise HTTPException(status_code=403, detail="Only this course's primary teacher or a school admin can add a co-teacher")

    email = payload.email.strip().lower()
    teacher = db.query(User).filter(
        User.school_id == school_id, User.role == UserRole.TEACHER, func.lower(User.email) == email,
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="No teacher with this email was found in your school")
    if teacher.id == course.created_by_id:
        raise HTTPException(status_code=400, detail="This teacher already owns the course")

    existing = db.query(CourseTeacher).filter(CourseTeacher.course_id == course_id, CourseTeacher.teacher_id == teacher.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This teacher is already a co-teacher on this course")

    link = CourseTeacher(course_id=course_id, teacher_id=teacher.id, school_id=school_id)
    db.add(link)

    try:
        create_notification(
            db, school_id=school_id, user_id=teacher.id,
            type="co_teacher_added", title="Added as a co-teacher",
            message=f"{current_user.full_name} added you as a co-teacher on \"{course.title}\".",
            link=f"/teacher/courses/{course_id}",
        )
    except Exception:
        pass

    db.commit()
    db.refresh(link)
    return CoTeacherResponse(id=link.id, teacher_id=teacher.id, name=teacher.full_name, email=teacher.email, added_at=link.added_at)


@router.delete("/courses/{course_id}/co-teachers/{teacher_id}")
def remove_co_teacher(
    course_id: str,
    teacher_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id, Course.school_id == school_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    if not _is_primary_owner_or_admin(course, current_user):
        raise HTTPException(status_code=403, detail="Only this course's primary teacher or a school admin can remove a co-teacher")

    link = db.query(CourseTeacher).filter(CourseTeacher.course_id == course_id, CourseTeacher.teacher_id == teacher_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Co-teacher not found on this course")

    db.delete(link)
    db.commit()
    return {"message": "Co-teacher removed"}

# ---------------------------------------------------------------------------
# Formal report card / progress report PDF (Task #49). A teacher may only
# generate one for a student actually enrolled in one of their own (or
# co-taught) courses -- the School Admin equivalent (any student in the
# school) lives in school_admin.py.
# ---------------------------------------------------------------------------
@router.get("/students/{student_id}/report-card")
def get_student_report_card(
    student_id: str,
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi.responses import StreamingResponse
    from app.services.report_card import generate_report_card_pdf

    student = db.query(User).filter(
        User.id == student_id, User.school_id == school_id, User.role == UserRole.STUDENT
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course_ids = _owned_course_ids(db, school_id, current_user)
    if course_ids is not None:
        is_enrolled_in_own_course = (
            db.query(Enrollment)
            .filter(Enrollment.student_id == student_id, Enrollment.course_id.in_(course_ids or []))
            .first()
            is not None
        )
        if not is_enrolled_in_own_course:
            raise HTTPException(status_code=403, detail="This student is not enrolled in any course you teach")

    buf = generate_report_card_pdf(db, current_user.school, student)
    filename = f"report_card_{student.full_name.replace(' ', '_')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ---------------------------------------------------------------------------
# Search across course content (Task #52) -- scoped to the teacher's own
# (or co-taught) courses; ADMIN calling this same router gets everything.
# ---------------------------------------------------------------------------
@router.get("/search")
def search_course_content_teacher(
    q: str = "",
    school_id: str = Depends(get_current_school_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.search_service import search_course_content

    course_ids = _owned_course_ids(db, school_id, current_user)
    return search_course_content(db, school_id, course_ids, q)
