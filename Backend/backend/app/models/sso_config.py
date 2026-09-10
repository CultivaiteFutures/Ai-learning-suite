import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class SSOConfiguration(Base):
    """
    Task #62: per-school, per-provider SSO settings (Google / Clever /
    ClassLink). Deliberately inert until a School Admin enters a real
    client_id + client_secret from that provider's developer console --
    is_configured (see app/services/sso_service.py) gates every SSO route
    on that, so an unconfigured row never attempts a real OAuth redirect.
    client_secret is write-only from the API's perspective: the response
    schema only ever reports has_secret, never the raw value.
    """
    __tablename__ = "sso_configurations"
    __table_args__ = (
        UniqueConstraint("school_id", "provider", name="uq_sso_school_provider"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False)  # "google" | "clever" | "classlink"
    is_enabled = Column(Boolean, default=False)
    client_id = Column(String, nullable=True)
    client_secret = Column(String, nullable=True)
    domain_restriction = Column(String, nullable=True)  # e.g. "school.edu" -- routes that email domain to this config
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
