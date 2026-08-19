from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseAIProvider(ABC):
    @abstractmethod
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
        additional_instructions: str = ""
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def generate_assignment(
        self,
        topic: str,
        grade_level: str = "Grade 10",
        instructions: str = ""
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def tutor_chat(
        self,
        question: str,
        context_info: str = "",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        pass

    @abstractmethod
    def generate_course_from_pdf(
        self,
        pdf_text: str,
        filename: str
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def grade_submission(
        self,
        submission_text: str,
        answer_key: str,
        assignment_title: str = "",
        max_points: float = 100.0
    ) -> Dict[str, Any]:
        pass
