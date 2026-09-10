from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class BaseSchema(BaseModel):
    """
    Same camelCase-serializing base used by every other schema module in
    this app (app/schemas/lms.py, app/schemas/challenges.py, ...). Every
    schema below inherits from this -- NOT from plain pydantic.BaseModel --
    so responses serialize as camelCase like the rest of the API, and
    requests can be sent either camelCase or snake_case.
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class NotificationResponse(BaseSchema):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseSchema):
    unread_count: int
