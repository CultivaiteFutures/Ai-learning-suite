from typing import Optional, List, Dict, Any
from app.services.ai_providers.factory import get_ai_provider

class AIService:
    """
    Unified AI service delegating to the appropriate AI provider (Google Gemini or Anthropic Claude).
    Supports per-school provider selection and defaults to Gemini.
    """
    def _get_provider(self, provider_name: Optional[str] = None):
        return get_ai_provider(provider_name)

    def generate_course_structure(
        self,
        course_name: str,
        grade: str,
        subject: str,
        language: str = "English",
        difficulty: str = "Medium",
        objectives: str = "",
        number_of_modules: int = 4,
        lesson_duration: str = "30 mins",
        additional_instructions: str = "",
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        p = self._get_provider(provider)
        return p.generate_course_structure(
            course_name=course_name,
            grade=grade,
            subject=subject,
            language=language,
            difficulty=difficulty,
            objectives=objectives,
            number_of_modules=number_of_modules,
            lesson_duration=lesson_duration,
            additional_instructions=additional_instructions
        )

    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = "",
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        p = self._get_provider(provider)
        return p.generate_assignment(
            topic=topic,
            grade_level=grade_level,
            instructions=instructions
        )

    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None,
        provider: Optional[str] = None
    ) -> str:
        p = self._get_provider(provider)
        return p.tutor_chat(
            question=question,
            context_info=context_info,
            history=history
        )

    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        p = self._get_provider(provider)
        return p.generate_course_from_pdf(
            pdf_text=pdf_text,
            filename=filename
        )

    def grade_submission(
        self,
        submission_text: str,
        answer_key: str,
        assignment_title: str = "",
        max_points: float = 100.0,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        p = self._get_provider(provider)
        return p.grade_submission(
            submission_text=submission_text,
            answer_key=answer_key,
            assignment_title=assignment_title,
            max_points=max_points
        )

ai_service = AIService()