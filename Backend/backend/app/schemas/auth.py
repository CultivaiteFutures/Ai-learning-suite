from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

class UserAuthResponse(BaseSchema):
    id: str
    name: str
    email: str
    role: str
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    accessToken: Optional[str] = None
    token_type: str = "bearer"
    user: UserAuthResponse

    @model_validator(mode='after')
    def set_token_alias(self):
        if not self.accessToken:
            self.accessToken = self.access_token
        return self

    class Config:
        from_attributes = True