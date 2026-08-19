from typing import Optional
from app.core.config import settings
from app.services.ai_providers.base import BaseAIProvider
from app.services.ai_providers.gemini_provider import GeminiAIProvider
from app.services.ai_providers.claude_provider import ClaudeAIProvider

_providers = {}

def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    name = (provider_name or settings.DEFAULT_AI_PROVIDER or "gemini").strip().lower()
    
    if name in ["claude", "anthropic"]:
        if "claude" not in _providers:
            _providers["claude"] = ClaudeAIProvider()
        return _providers["claude"]
    else:
        # Default to Gemini
        if "gemini" not in _providers:
            _providers["gemini"] = GeminiAIProvider()
        return _providers["gemini"]
