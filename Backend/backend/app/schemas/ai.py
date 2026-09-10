from pydantic import BaseModel
from typing import Optional, List, Any

class AICourseGenerateRequest(BaseModel):
    course_name: str
    grade: str
    subject: str
    language: str = "English"
    difficulty: str = "Medium"
    objectives: Optional[str] = ""
    number_of_modules: int = 4
    lesson_duration: str = "30 mins"
    additional_instructions: Optional[str] = ""

class AIAssignmentGenerateRequest(BaseModel):
    topic: str
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    grade_level: Optional[str] = "Grade 10"
    instructions: Optional[str] = ""

class AITutorChatRequest(BaseModel):
    question: str
    course_id: Optional[str] = None
    lesson_id: Optional[str] = None
    conversation_history: Optional[List[dict]] = []
