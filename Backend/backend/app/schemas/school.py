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

class SchoolCreate(BaseSchema):
    name: Optional[str] = None
    school_name: Optional[str] = None
    schoolName: Optional[str] = None
    domain: Optional[str] = None
    admin_email: Optional[str] = None
    adminEmail: Optional[str] = None
    admin_name: Optional[str] = None
    adminName: Optional[str] = None
    admin_password: Optional[str] = None
    adminPassword: Optional[str] = None
    plan: Optional[str] = "Professional"
    ai_provider: Optional[str] = "gemini"
    aiProvider: Optional[str] = "gemini"

    @model_validator(mode='after')
    def resolve_names(self):
        if not self.name and self.school_name:
            self.name = self.school_name
        if not self.name and self.schoolName:
            self.name = self.schoolName
        if not self.name:
            self.name = "New School"
        if not self.admin_email and self.adminEmail:
            self.admin_email = self.adminEmail
        if not self.admin_name and self.adminName:
            self.admin_name = self.adminName
        if not self.admin_password and self.adminPassword:
            self.admin_password = self.adminPassword
        if not self.ai_provider and self.aiProvider:
            self.ai_provider = self.aiProvider
        return self

class SchoolUpdate(BaseSchema):
    name: Optional[str] = None
    school_name: Optional[str] = None
    schoolName: Optional[str] = None
    domain: Optional[str] = None
    is_active: Optional[bool] = None
    ai_provider: Optional[str] = None
    aiProvider: Optional[str] = None
    admin_email: Optional[str] = None
    adminEmail: Optional[str] = None
    admin_password: Optional[str] = None
    adminPassword: Optional[str] = None
    admin_name: Optional[str] = None
    adminName: Optional[str] = None
    plan: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscriptionPlan: Optional[str] = None

    @model_validator(mode='after')
    def resolve_aliases(self):
        if not self.name and self.school_name:
            self.name = self.school_name
        if not self.name and self.schoolName:
            self.name = self.schoolName
        if not self.admin_email and self.adminEmail:
            self.admin_email = self.adminEmail
        if not self.admin_password and self.adminPassword:
            self.admin_password = self.adminPassword
        if not self.admin_name and self.adminName:
            self.admin_name = self.adminName
        if not self.ai_provider and self.aiProvider:
            self.ai_provider = self.aiProvider
        if not self.plan and self.subscription_plan:
            self.plan = self.subscription_plan
        if not self.plan and self.subscriptionPlan:
            self.plan = self.subscriptionPlan
        return self

from app.schemas.user import UserResponse

class SchoolResponse(BaseSchema):
    id: str
    name: str
    school_name: Optional[str] = None
    domain: Optional[str] = None
    is_active: bool
    ai_provider: Optional[str] = "gemini"
    aiProvider: Optional[str] = "gemini"
    status: Optional[str] = "active"
    subscription_plan: Optional[str] = "Professional"
    student_count: Optional[int] = 0
    teacher_count: Optional[int] = 0
    course_count: Optional[int] = 0
    admin_user: Optional[UserResponse] = None
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_id: Optional[str] = None
    generated_admin_password: Optional[str] = None
    created_at: Optional[datetime] = None
    created_date: Optional[str] = None

    @model_validator(mode='after')
    def set_school_aliases(self):
        if not self.school_name and self.name:
            self.school_name = self.name
        self.status = "active" if self.is_active else "suspended"
        if self.created_at and not self.created_date:
            self.created_date = self.created_at.strftime("%Y-%m-%d")
        if self.admin_user:
            self.admin_name = self.admin_user.full_name
            self.admin_email = self.admin_user.email
            self.admin_id = self.admin_user.id
        return self

class SubscriptionUpdate(BaseSchema):
    plan: Optional[str] = None
    status: Optional[str] = None
    end_date: Optional[datetime] = None
    endDate: Optional[datetime] = None

    @model_validator(mode='after')
    def resolve_aliases(self):
        if not self.end_date and self.endDate:
            self.end_date = self.endDate
        return self

class SubscriptionResponse(BaseSchema):
    id: str
    school_id: str
    school_name: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
