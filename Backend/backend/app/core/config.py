import json
from typing import List, Union
from pydantic import validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Learning Suite API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-jwt-key-change-this-in-production-ai-suite"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_learning"
    DEFAULT_AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    FIRST_SUPERUSER: str = "superadmin@system.com"
    FIRST_SUPERUSER_PASSWORD: str = "password123"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]

    @validator("DATABASE_URL", pre=True)
    def fix_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("postgres://"):
                v = "postgresql://" + v[len("postgres://"):]
        return v

    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                return json.loads(v)
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"

settings = Settings()