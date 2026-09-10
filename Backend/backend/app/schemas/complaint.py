from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ComplaintCreate(BaseSchema):
    subject: str
    description: str


class ComplaintUpdate(BaseSchema):
    status: Optional[str] = None
    resolution_note: Optional[str] = None


class ComplaintResponse(BaseSchema):
    id: str
    school_id: str
    school_name: Optional[str] = None
    submitted_by_id: Optional[str] = None
    submitted_by_name: Optional[str] = None
    subject: str
    description: str
    status: str
    resolution_note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
