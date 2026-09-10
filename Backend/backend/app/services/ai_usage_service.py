"""
Task #56: records one AIUsageLog row per AI provider call. Mirrors the
"never blocks the primary action" convention used by create_notification --
a metering failure should never break the AI feature it's measuring.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.ai_usage import AIUsageLog

CHARS_PER_TOKEN_ESTIMATE = 4


def estimate_tokens(*texts: Optional[str]) -> int:
    total_chars = sum(len(t) for t in texts if t)
    return max(1, total_chars // CHARS_PER_TOKEN_ESTIMATE)


def log_ai_usage(
    db: Session,
    school_id: str,
    user_id: Optional[str],
    feature: str,
    provider: Optional[str] = None,
    input_text: str = "",
    output_text: str = "",
) -> None:
    try:
        log = AIUsageLog(
            school_id=school_id,
            user_id=user_id,
            feature=feature,
            provider=provider,
            estimated_tokens=estimate_tokens(input_text, output_text),
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
