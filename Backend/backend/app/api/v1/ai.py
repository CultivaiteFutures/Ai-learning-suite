from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import io
import pypdf

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.course import Course, Lesson, Module
from app.models.lms import Submission, Assignment, Enrollment
from app.models.rubric import RubricCriterion
from app.schemas.ai import AICourseGenerateRequest, AIAssignmentGenerateRequest, AITutorChatRequest
from app.services.ai_service import ai_service
from app.services.ai_usage_service import log_ai_usage
from app.services.pdf_service import pdf_service

router = APIRouter()

TEACHING_ROLES = [UserRole.TEACHER, UserRole.ADMIN]
TUTOR_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN]


def _course_in_scope(db: Session, course_id: str, current_user: User) -> Optional[Course]:
    """
    Resolve a course by id, but ONLY if it belongs to the caller's school
    (and, for students, only if they are actually enrolled in it).
    Never trusts course_id alone -- always re-checks tenant/enrollment server-side.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return None
    if course.school_id != current_user.school_id:
        return None
    if current_user.role == UserRole.STUDENT:
        enrolled = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.student_id == current_user.id,
        ).first()
        if not enrolled:
            return None
    return course


def _lesson_in_scope(db: Session, lesson_id: str, current_user: User) -> Optional[Lesson]:
    """
    Resolve a lesson by id, but only if its parent course is in scope for this caller
    (same tenant/enrollment rules as _course_in_scope).
    """
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        return None
    module = db.query(Module).filter(Module.id == lesson.module_id).first()
    if not module:
        return None
    course = _course_in_scope(db, module.course_id, current_user)
    if not course:
        return None
    return lesson


@router.post("/generate-course", dependencies=[Depends(require_roles(TEACHING_ROLES))])
def generate_course_ai(payload: AICourseGenerateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Generate course JSON using the school's configured AI provider (defaults to Gemini)
    """
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    result = ai_service.generate_course_structure(
        course_name=payload.course_name,
        grade=payload.grade,
        subject=payload.subject,
        language=payload.language,
        difficulty=payload.difficulty,
        objectives=payload.objectives,
        number_of_modules=payload.number_of_modules,
        lesson_duration=payload.lesson_duration,
        additional_instructions=payload.additional_instructions,
        provider=provider
    )
    log_ai_usage(db, current_user.school_id, current_user.id, "generate_course", provider=provider, input_text=payload.course_name + payload.objectives, output_text=str(result))
    return result


@router.post("/generate-assignment", dependencies=[Depends(require_roles(TEACHING_ROLES))])
def generate_assignment_ai(payload: AIAssignmentGenerateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Generate assignment topic and description using AI
    """
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    result = ai_service.generate_assignment(
        topic=payload.topic,
        grade_level=payload.grade_level or "Grade 10",
        instructions=payload.instructions or "",
        provider=provider
    )
    log_ai_usage(db, current_user.school_id, current_user.id, "generate_assignment", provider=provider, input_text=payload.topic + (payload.instructions or ""), output_text=str(result))
    return result


@router.post("/generate-course-from-pdf", dependencies=[Depends(require_roles(TEACHING_ROLES))])
async def generate_course_from_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Teacher uploads PDF -> Backend extracts text -> AI structures course
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    contents = await file.read()
    result = pdf_service.generate_course_from_pdf(contents, file.filename, provider=provider)
    log_ai_usage(db, current_user.school_id, current_user.id, "generate_course_from_pdf", provider=provider, input_text=file.filename, output_text=str(result))
    return result


@router.post("/tutor-chat", dependencies=[Depends(require_roles(TUTOR_ROLES))])
def tutor_chat(
    payload: AITutorChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI Tutor Chat Endpoint grounded in current Course & Lesson content.
    Course/lesson context is only ever pulled if it belongs to the caller's own
    school AND (for students) the caller is actually enrolled in that course --
    course_id/lesson_id from the client are never trusted on their own.
    """
    context_lines = []

    # 1. Fetch real course curriculum from PostgreSQL if course_id provided -- tenant/enrollment scoped
    if payload.course_id:
        course = _course_in_scope(db, payload.course_id, current_user)
        if not course:
            raise HTTPException(status_code=403, detail="You do not have access to this course.")
        context_lines.append(f"Course Title: {course.title} (Subject: {course.subject}, Grade Level: {course.grade_level})")
        if course.description:
            context_lines.append(f"Course Curriculum Overview: {course.description}")
        for mod in course.modules:
            context_lines.append(f"- Module: {mod.title}")
            for les in mod.lessons:
                sum_txt = f" (Summary: {les.summary})" if les.summary else ""
                context_lines.append(f"  * Lesson: {les.title}{sum_txt}")

    # 2. Fetch specific lesson content from PostgreSQL if lesson_id provided -- same scoping
    if payload.lesson_id:
        lesson = _lesson_in_scope(db, payload.lesson_id, current_user)
        if not lesson:
            raise HTTPException(status_code=403, detail="You do not have access to this lesson.")
        context_lines.append(f"\n--- ACTIVE LESSON: {lesson.title} ---")
        if lesson.content:
            context_lines.append(f"Detailed Lesson Content:\n{lesson.content[:4000]}")
        if lesson.summary:
            context_lines.append(f"Lesson Key Summary:\n{lesson.summary}")

    context_str = "\n".join(context_lines) if context_lines else "General Educational Course Material"
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None

    reply = ai_service.tutor_chat(
        question=payload.question,
        context_info=context_str,
        history=payload.conversation_history,
        provider=provider
    )
    log_ai_usage(db, current_user.school_id, current_user.id, "tutor_chat", provider=provider, input_text=payload.question, output_text=reply)
    return {"reply": reply}


@router.post("/grade-submission-with-answer-key", dependencies=[Depends(require_roles(TEACHING_ROLES))])
async def grade_submission_with_answer_key(
    submission_id: str = Form(...),
    answer_key_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teacher uploads Answer Key PDF or text -> AI compares student submission -> Returns proposed grade for review.
    Submission lookup is scoped to the caller's own school -- a teacher/admin can never
    grade-preview another school's submission by guessing its id.
    """
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.school_id == current_user.school_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    assignment_title = assignment.title if assignment else "Assignment"
    max_points = assignment.max_points if assignment else 100.0

    key_content = answer_key_text or ""
    if file and file.filename.endswith(".pdf"):
        pdf_bytes = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text() or ""
        key_content = f"{key_content}\n{extracted_text}".strip()

    if not key_content.strip():
        raise HTTPException(status_code=400, detail="Answer key text or PDF file is required for evaluation.")

    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    grade_result = ai_service.grade_submission(
        submission_text=submission.content or "No submission content provided",
        answer_key=key_content,
        assignment_title=assignment_title,
        max_points=max_points,
        provider=provider
    )
    log_ai_usage(db, current_user.school_id, current_user.id, "grade_submission", provider=provider, input_text=(submission.content or "") + key_content, output_text=str(grade_result))
    return grade_result


@router.post("/grade-submission-with-rubric", dependencies=[Depends(require_roles(TEACHING_ROLES))])
def grade_submission_with_rubric(
    submission_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    The rubric-aware counterpart to /grade-submission-with-answer-key: AI
    reads the submission against EVERY criterion on the assignment's
    attached rubric and proposes a per-criterion score + justification, for
    the teacher to review, adjust, and save via the normal grade_submission
    endpoint (teacher.py) -- exactly like the answer-key path, this never
    writes to the submission itself. Requires the assignment to actually
    have a rubric attached (Assignment.rubric_id); an assignment graded by
    a plain answer key or with no grading aid at all should use the
    answer-key endpoint or manual entry instead.
    """
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.school_id == current_user.school_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = db.query(Assignment).filter(Assignment.id == submission.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not assignment.rubric_id:
        raise HTTPException(status_code=400, detail="This assignment has no rubric attached")

    criteria = db.query(RubricCriterion).filter(RubricCriterion.rubric_id == assignment.rubric_id).order_by(RubricCriterion.order).all()
    if not criteria:
        raise HTTPException(status_code=400, detail="This assignment's rubric has no criteria")

    criteria_payload = [
        {"id": c.id, "title": c.title, "description": c.description or "", "max_points": c.max_points}
        for c in criteria
    ]

    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    grade_result = ai_service.grade_submission_with_rubric(
        submission_text=submission.content or "No submission content provided",
        criteria=criteria_payload,
        assignment_title=assignment.title,
        provider=provider
    )

    # The model is asked to echo criterion ids back verbatim, but never trust
    # that blindly -- drop any id it didn't actually receive and clamp every
    # score into the criterion's own 0..max_points range before it ever
    # reaches the teacher's screen.
    valid_criteria = {c.id: c for c in criteria}
    cleaned = []
    for entry in (grade_result.get("criteria") or []):
        criterion_id = entry.get("criterion_id")
        criterion = valid_criteria.get(criterion_id)
        if not criterion:
            continue
        points = entry.get("suggested_points")
        try:
            points = float(points)
        except (TypeError, ValueError):
            points = 0.0
        points = max(0.0, min(points, float(criterion.max_points)))
        cleaned.append({
            "criterion_id": criterion_id,
            "suggested_points": points,
            "justification": entry.get("justification") or "",
        })
    result = {"criteria": cleaned, "overall_feedback": grade_result.get("overall_feedback") or ""}

    log_ai_usage(
        db, current_user.school_id, current_user.id, "grade_submission_with_rubric",
        provider=provider, input_text=(submission.content or "") + str(criteria_payload), output_text=str(result),
    )
    return result
