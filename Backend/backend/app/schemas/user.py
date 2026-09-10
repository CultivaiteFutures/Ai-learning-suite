from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List
from app.models.user import UserRole

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class UserCreate(BaseSchema):
    email: EmailStr
    password: Optional[str] = None
    full_name: Optional[str] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    grade_id: Optional[str] = None
    section: Optional[str] = None

    @model_validator(mode='after')
    def resolve_name(self):
        if not self.full_name and self.name:
            self.full_name = self.name
        if not self.full_name:
            self.full_name = str(self.email).split('@')[0]
        return self

class UserUpdate(BaseSchema):
    full_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    grade_id: Optional[str] = None
    section: Optional[str] = None

    @model_validator(mode='after')
    def resolve_name(self):
        if not self.full_name and self.name:
            self.full_name = self.name
        return self

class UserResponse(BaseSchema):
    id: str
    email: str
    full_name: str
    name: Optional[str] = None
    role: str
    school_id: Optional[str] = None
    grade_id: Optional[str] = None
    section: Optional[str] = None
    is_active: bool
    generated_password: Optional[str] = None

    @model_validator(mode='after')
    def set_name_alias(self):
        if not self.name and self.full_name:
            self.name = self.full_name
        return self


class ParentCreate(BaseSchema):
    email: EmailStr
    password: Optional[str] = None
    full_name: Optional[str] = None
    name: Optional[str] = None
    student_ids: List[str] = []

    @model_validator(mode='after')
    def resolve_name(self):
        if not self.full_name and self.name:
            self.full_name = self.name
        if not self.full_name:
            self.full_name = str(self.email).split('@')[0]
        return self


class ParentUpdate(BaseSchema):
    full_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    student_ids: Optional[List[str]] = None  # when provided, replaces the full linked-children set

    @model_validator(mode='after')
    def resolve_name(self):
        if not self.full_name and self.name:
            self.full_name = self.name
        return self


class ParentResponse(BaseSchema):
    id: str
    email: str
    full_name: str
    name: Optional[str] = None
    is_active: bool
    generated_password: Optional[str] = None
    children: List[dict] = []

    @model_validator(mode='after')
    def set_name_alias(self):
        if not self.name and self.full_name:
            self.name = self.full_name
        return self
