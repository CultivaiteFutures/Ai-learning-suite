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
    students_count: int = 0
    teachers_count: int = 0
    sections: int = 0

class AssignmentCreate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    lesson_id: Optional[str] = None
    lessonId: Optional[str] = None
    due_date: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    max_points: Optional[int] = 100
    maxPoints: Optional[int] = 100
    answer_key: Optional[str] = None
    answerKey: Optional[str] = None
    target_type: Optional[str] = "all"
    targetType: Optional[str] = "all"
    target_grade: Optional[str] = None
    targetGrade: Optional[str] = None
    target_section: Optional[str] = None
    targetSection: Optional[str] = None
    type: Optional[str] = "Quiz"
    config: Optional[Any] = None
    rubric_id: Optional[str] = None

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
        if not self.answer_key and self.answerKey:
            self.answer_key = self.answerKey
        if not self.target_type and self.targetType:
            self.target_type = self.targetType
        if not self.target_grade and self.targetGrade:
            self.target_grade = self.targetGrade
        if not self.target_section and self.targetSection:
            self.target_section = self.targetSection
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
    answer_key: Optional[str] = None
    target_type: Optional[str] = "all"
    target_grade: Optional[str] = None
    target_section: Optional[str] = None
    type: Optional[str] = "Quiz"
    config: Optional[Any] = None
    rubric_id: Optional[str] = None
    created_at: Optional[datetime] = None

class SubmissionCreate(BaseSchema):
    content: Optional[str] = None
    file_url: Optional[str] = None
    answers: Optional[List[int]] = None  # student's selected option index per question, in order -- ONLY meaningful for a real auto-graded quiz submission

class SubmissionResponse(BaseSchema):
    id: str
    school_id: str
    assignment_id: str
    student_id: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    grade_points: Optional[float] = None
    feedback: Optional[str] = None
    rubric_scores: Optional[List[Any]] = None
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



# ---------------------------------------------------------------------------
# Fun Games module (teacher/admin management API in app/api/v1/games.py).
# Reuses the existing EvaluationGame/GameResult models above -- these are new,
# dedicated request/response schemas for that router (the older
# EvaluationGameCreate/EvaluationGameResponse/GameResult* schemas above were
# already defined but never wired to any route; they are left untouched).
# ---------------------------------------------------------------------------

class GameCreate(BaseSchema):
    """Used for both POST /games (create) and PUT /games/{id} (update, all fields optional)."""
    title: Optional[str] = None
    game_type: Optional[str] = None
    gameType: Optional[str] = None
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    lesson_id: Optional[str] = None
    lessonId: Optional[str] = None
    config: Optional[Any] = None
    is_published: Optional[bool] = None
    isPublished: Optional[bool] = None

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.game_type and self.gameType:
            self.game_type = self.gameType
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        if not self.lesson_id and self.lessonId:
            self.lesson_id = self.lessonId
        if self.is_published is None and self.isPublished is not None:
            self.is_published = self.isPublished
        return self


class GameUpdate(GameCreate):
    """Identical shape to GameCreate -- kept as a distinct name for clarity at the route layer."""
    pass


class GameResponse(BaseSchema):
    id: str
    school_id: str
    course_id: str
    lesson_id: Optional[str] = None
    title: str
    game_type: str
    config: Optional[Any] = None
    is_published: bool = True
    created_at: Optional[datetime] = None
    attempt_count: int = 0
    average_score: Optional[float] = None


class AnnouncementCreate(BaseSchema):
    title: str
    content: str
    course_id: Optional[str] = None
    courseId: Optional[str] = None

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        return self

class AnnouncementResponse(BaseSchema):
    id: str
    school_id: str
    course_id: Optional[str] = None
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    title: str
    content: str
    created_at: Optional[datetime] = None

class DiscussionCreate(BaseSchema):
    title: str
    content: str
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    lesson_id: Optional[str] = None
    lessonId: Optional[str] = None

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        if not self.lesson_id and self.lessonId:
            self.lesson_id = self.lessonId
        return self

class DiscussionReplyCreate(BaseSchema):
    content: str

class DiscussionReplyResponse(BaseSchema):
    id: str
    discussion_id: str
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None

class DiscussionResponse(BaseSchema):
    id: str
    school_id: str
    course_id: str
    lesson_id: Optional[str] = None
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    title: str
    content: str
    is_resolved: bool = False
    created_at: Optional[datetime] = None

class DiscussionDetailResponse(DiscussionResponse):
    replies: List[DiscussionReplyResponse] = []

class DiscussionResolveUpdate(BaseSchema):
    is_resolved: Optional[bool] = None
    isResolved: Optional[bool] = None

    @model_validator(mode='after')
    def resolve_fields(self):
        if self.is_resolved is None and self.isResolved is not None:
            self.is_resolved = self.isResolved
        return self
