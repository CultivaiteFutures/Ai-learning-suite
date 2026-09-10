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


class SSOConfigUpdate(BaseSchema):
    """
    client_secret is accepted here but never returned by SSOConfigResponse --
    write-only, same convention as an admin-set password. Passing null/omitted
    leaves an already-stored secret untouched; passing an empty string clears it.
    """
    is_enabled: Optional[bool] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    domain_restriction: Optional[str] = None


class SSOConfigResponse(BaseSchema):
    provider: str
    label: str
    is_enabled: bool
    client_id: Optional[str] = None
    has_secret: bool
    domain_restriction: Optional[str] = None
    updated_at: Optional[datetime] = None
