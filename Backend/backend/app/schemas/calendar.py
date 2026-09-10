from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class CalendarEventCreate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    courseId: Optional[str] = None
    event_date: Optional[datetime] = None
    eventDate: Optional[datetime] = None
    event_type: Optional[str] = "event"
    eventType: Optional[str] = "event"

    @model_validator(mode='after')
    def resolve_fields(self):
        if not self.course_id and self.courseId:
            self.course_id = self.courseId
        if not self.event_date and self.eventDate:
            self.event_date = self.eventDate
        if not self.event_type and self.eventType:
            self.event_type = self.eventType
        if not self.event_type:
            self.event_type = "event"
        return self

class CalendarEventResponse(BaseSchema):
    id: str
    school_id: str
    course_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    event_date: datetime
    event_type: Optional[str] = "event"
    created_by_id: Optional[str] = None
    created_at: Optional[datetime] = None
