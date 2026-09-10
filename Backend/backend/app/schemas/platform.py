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


class MaintenanceStatusResponse(BaseSchema):
    """Public (unauthenticated) view -- also doubles as the platform's public
    branding info (name + support contact) so the landing/login pages and
    every dashboard can read both in the one call they already make."""
    maintenance_mode: bool
    maintenance_message: Optional[str] = None
    platform_name: Optional[str] = None
    support_email: Optional[str] = None
    updated_at: Optional[datetime] = None


class MaintenanceUpdate(BaseSchema):
    maintenance_mode: bool
    maintenance_message: Optional[str] = None


class PlatformBrandingResponse(BaseSchema):
    platform_name: str
    support_email: Optional[str] = None
    updated_at: Optional[datetime] = None


class PlatformBrandingUpdate(BaseSchema):
    platform_name: str
    support_email: Optional[str] = None
