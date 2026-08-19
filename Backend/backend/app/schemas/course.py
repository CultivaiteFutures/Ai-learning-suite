from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import List, Optional, Any
from datetime import datetime

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class LessonCreate(BaseSchema):
    title: Optional[str] = None
    name: Optional[str] = None
    content: Optional[str] = ""
    summary: Optional[str] = ""
    duration_minutes: Optional[int] = 30
    order: Optional[int] = 0
    activities: Optional[Any] = None
    homework: Optional[Any] = None
    quiz: Optional[Any] = None

    @model_validator(mode='after')
    def resolve_title(self):
        if not self.title and self.name:
            self.title = self.name
        if not self.title:
            self.title = "Untitled Lesson"
        return self

class LessonResponse(LessonCreate):
    id: str
    module_id: str
    name: Optional[str] = None

    @model_validator(mode='after')
    def set_name_alias(self):
        if not self.name and self.title:
            self.name = self.title
        return self

class ModuleCreate(BaseSchema):
    title: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = ""
    order: Optional[int] = 0
    lessons: Optional[List[LessonCreate]] = []

    @model_validator(mode='after')
    def resolve_title(self):
        if not self.title and self.name:
            self.title = self.name
        if not self.title:
            self.title = "Untitled Module"
        return self

class ModuleResponse(BaseSchema):
    id: str
    title: str
    name: Optional[str] = None
    description: Optional[str] = ""
    order: int
    lessons: List[LessonResponse] = []

    @model_validator(mode='after')
    def set_name_alias(self):
        if not self.name and self.title:
            self.name = self.title
        return self

class CourseCreate(BaseSchema):
    title: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = ""
    subject: Optional[str] = ""
    grade_level: Optional[str] = ""
    grade: Optional[str] = ""
    language: Optional[str] = "English"
    difficulty: Optional[str] = "Medium"
    modules: Optional[List[ModuleCreate]] = []

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.title and self.name:
            self.title = self.name
        if not self.title:
            self.title = "Untitled Course"
        if not self.grade_level and self.grade:
            self.grade_level = self.grade
        return self

class CourseResponse(BaseSchema):
    id: str
    title: str
    name: Optional[str] = None
    join_code: Optional[str] = None
    joinCode: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    grade: Optional[str] = None
    language: Optional[str] = "English"
    difficulty: Optional[str] = "Medium"
    is_published: bool
    status: Optional[str] = "published"
    is_golden_template: bool
    origin_template_id: Optional[str] = None
    school_id: Optional[str] = None
    created_at: Optional[datetime] = None
    modules: List[ModuleResponse] = []

    @model_validator(mode='after')
    def set_aliases(self):
        if not self.name and self.title:
            self.name = self.title
        if not self.grade and self.grade_level:
            self.grade = self.grade_level
        if not self.joinCode and self.join_code:
            self.joinCode = self.join_code
        self.status = "published" if self.is_published else "draft"
        return self