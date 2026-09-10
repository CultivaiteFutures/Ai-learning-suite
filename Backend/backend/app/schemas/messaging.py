from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime


class BaseSchema(BaseModel):
    """Same camelCase-serializing base every other schema module uses."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ContactResponse(BaseSchema):
    id: str
    name: str
    role: str
    email: Optional[str] = None


class StartConversationRequest(BaseSchema):
    recipient_id: str


class MessageCreate(BaseSchema):
    body: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseSchema):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    body: str
    is_read: bool
    is_mine: bool
    created_at: datetime


class ConversationResponse(BaseSchema):
    id: str
    other_participant: ContactResponse
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    created_at: datetime
