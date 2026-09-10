from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Highlight(BaseSchema):
    text: str


class LessonNoteUpsert(BaseSchema):
    notes_text: Optional[str] = None
    highlights: List[Highlight] = []
    is_bookmarked: bool = False


class LessonNoteResponse(BaseSchema):
    lesson_id: str
    notes_text: Optional[str] = None
    highlights: List[Highlight] = []
    is_bookmarked: bool = False
    updated_at: Optional[datetime] = None
