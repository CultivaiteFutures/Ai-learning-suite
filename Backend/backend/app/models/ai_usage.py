"""
Task #56: AI usage/cost metering per school. One row per AI call, logged by
app/services/ai_usage_service.py right after each provider call returns.
The app's AI provider abstraction (BaseAIProvider) doesn't surface exact
token counts from the underlying API responses today, so `estimated_tokens`
is a deliberate approximation (roughly 4 characters per token, the same
rule of thumb both Anthropic and Google publish) -- good enough to compare
usage and relative cost across schools/features without claiming
billing-grade precision.
"""
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    feature = Column(String, nullable=False)  # e.g. "tutor_chat", "generate_assignment", "grade_submission"
    provider = Column(String, nullable=True)  # "gemini" or "claude"
    estimated_tokens = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")
    user = relationship("User")
