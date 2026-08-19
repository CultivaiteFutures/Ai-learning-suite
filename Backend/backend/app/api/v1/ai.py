from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import io
import pypdf

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.course import Course, Lesson
from app.models.lms import Submission, Assignment
from app.schemas.ai import AICourseGenerateRequest, AIAssignmentGenerateRequest, AITutorChatRequest
from app.services.ai_service import ai_service
from app.services.pdf_service import pdf_service

router = APIRouter()

@router.post("/generate-course")
def generate_course_ai(payload: AICourseGenerateRequest, current_user: User = Depends(get_current_user)):
    """
    Generate course JSON using the school's configured AI provider (defaults to Gemini)
    """
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    return ai_service.generate_course_structure(
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


@router.post("/generate-assignment")
def generate_assignment_ai(payload: AIAssignmentGenerateRequest, current_user: User = Depends(get_current_user)):
    """
    Generate assignment topic and description using AI
    """
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    return ai_service.generate_assignment(
        topic=payload.topic,
        grade_level=payload.grade_level or "Grade 10",
        instructions=payload.instructions or "",
        provider=provider
    )


@router.post("/generate-course-from-pdf")
async def generate_course_from_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Teacher uploads PDF -> Backend extracts text -> AI structures course
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None
    contents = await file.read()
    return pdf_service.generate_course_from_pdf(contents, file.filename, provider=provider)


@router.post("/tutor-chat")
def tutor_chat(
    payload: AITutorChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI Tutor Chat Endpoint for Students grounded in current Course & Lesson content
    """
    context_lines = []
    
    # 1. Fetch real course curriculum from PostgreSQL if course_id provided
    if payload.course_id:
        course = db.query(Course).filter(Course.id == payload.course_id).first()
        if course:
            context_lines.append(f"Course Title: {course.title} (Subject: {course.subject}, Grade Level: {course.grade_level})")
            if course.description:
                context_lines.append(f"Course Curriculum Overview: {course.description}")
            for mod in course.modules:
                context_lines.append(f"- Module: {mod.title}")
                for les in mod.lessons:
                    sum_txt = f" (Summary: {les.summary})" if les.summary else ""
                    context_lines.append(f"  * Lesson: {les.title}{sum_txt}")

    # 2. Fetch specific lesson content from PostgreSQL if lesson_id provided
    if payload.lesson_id:
        lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
        if lesson:
            context_lines.append(f"\n--- ACTIVE LESSON: {lesson.title} ---")
            if lesson.content:
                context_lines.append(f"Detailed Lesson Content:\n{lesson.content[:4000]}")
            if lesson.summary:
                context_lines.append(f"Lesson Key Summary:\n{lesson.summary}")

    context_str = "\n".join(context_lines) if context_lines else "General Educational Course Material"
    provider = current_user.school.ai_provider if current_user and getattr(current_user, "school", None) else None

    return {
        "reply": ai_service.tutor_chat(
            question=payload.question,
            context_info=context_str,
            history=payload.conversation_history,
            provider=provider
        )
    }


@router.post("/grade-submission-with-answer-key")
async def grade_submission_with_answer_key(
    submission_id: str = Form(...),
    answer_key_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teacher uploads Answer Key PDF or text -> AI compares student submission -> Returns proposed grade for review
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
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
    return grade_result