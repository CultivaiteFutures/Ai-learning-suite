from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List, Any
from datetime import datetime

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class GradeCreate(BaseSchema):
    name: str
    code: Optional[str] = None

class GradeResponse(GradeCreate):
    id: str
    school_id: str

class AssignmentCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    lesson_id: Optional[str] = None
    lessonId: Optional[str] = None
    due_date: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    max_points: Optional[int] = 100
    maxPoints: Optional[int] = 100

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        if not self.lesson_id and self.lessonId:
            self.lesson_id = self.lessonId
        if not self.due_date and self.dueDate:
            self.due_date = self.dueDate
        if not self.max_points and self.maxPoints:
            self.max_points = self.maxPoints
        return self

class AssignmentResponse(BaseSchema):
    id: str
    school_id: str
    course_id: str
    lesson_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_points: Optional[int] = 100
    created_at: Optional[datetime] = None

class SubmissionCreate(BaseSchema):
    content: Optional[str] = None
    file_url: Optional[str] = None

class SubmissionResponse(BaseSchema):
    id: str
    school_id: str
    assignment_id: str
    student_id: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    grade_points: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None

class StudentStatsResponse(BaseSchema):
    id: str
    school_id: str
    student_id: str
    xp: int
    streak_days: int
    badges: List[Any] = []

class EvaluationGameCreate(BaseSchema):
    title: str
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    lesson_id: Optional[str] = None
    lessonId: Optional[str] = None
    game_type: Optional[str] = "quiz_match"
    gameType: Optional[str] = "quiz_match"
    config: Optional[Any] = None
    is_published: Optional[bool] = True
    isPublished: Optional[bool] = True

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        if not self.lesson_id and self.lessonId:
            self.lesson_id = self.lessonId
        if not self.game_type and self.gameType:
            self.game_type = self.gameType
        if self.is_published is None and self.isPublished is not None:
            self.is_published = self.isPublished
        return self

class EvaluationGameResponse(BaseSchema):
    id: str
    school_id: str
    course_id: str
    lesson_id: Optional[str] = None
    title: str
    game_type: Optional[str] = "quiz_match"
    config: Optional[Any] = None
    is_published: bool = True
    created_at: Optional[datetime] = None

class GameResultCreate(BaseSchema):
    game_id: Optional[str] = None
    gameId: Optional[str] = None
    score: int = 0

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.game_id and self.gameId:
            self.game_id = self.gameId
        return self

class GameResultResponse(BaseSchema):
    id: str
    school_id: str
    game_id: str
    student_id: str
    score: int
    completed_at: Optional[datetime] = None

