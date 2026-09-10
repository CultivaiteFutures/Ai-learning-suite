import bcrypt
import random
import re
import uuid
# Monkeypatch bcrypt attribute for passlib compatibility
if not hasattr(bcrypt, '__about__'):
    class About:
        __version__ = getattr(bcrypt, '__version__', '4.0.1')
    bcrypt.__about__ = About()

from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_temp_password(name: str = "", fallback: str = "User") -> str:
    """
    Generates a human-friendly temporary password in the same '<Name>@<4 digits>'
    style already used platform-wide for server-generated credentials (originally
    introduced by the bulk student Excel upload) -- the single source of truth for
    server-side password generation so every creation path stays consistent.
    """
    clean_parts = re.sub(r'[^a-zA-Z0-9\s]', '', name or '').lower().split()
    first_name_clean = clean_parts[0].capitalize() if clean_parts else fallback
    rand_digits = random.randint(1000, 9999)
    return f"{first_name_clean}@{rand_digits}"

def create_access_token(
    subject: Union[str, Any],
    role: str,
    school_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "school_id": str(school_id) if school_id else None
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_sso_state_token(provider: str, school_id: str, domain: str) -> str:
    """
    Task #62 (SSO scaffolding): the OAuth "state" parameter round-trips
    through the identity provider unmodified, so rather than standing up a
    separate state-storage table, this signs the school/provider context
    directly into it (short-lived, HS256, same SECRET_KEY as access tokens
    but a distinct "purpose" claim so it can never be replayed as a login
    token). The callback decodes and verifies this before doing anything else.
    """
    payload = {
        "purpose": "sso_state",
        "provider": provider,
        "school_id": school_id,
        "domain": domain,
        "nonce": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_sso_state_token(token: str) -> dict:
    """Raises jwt.PyJWTError (expired/invalid/tampered) or ValueError (wrong purpose) on failure."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("purpose") != "sso_state":
        raise ValueError("Not an SSO state token")
    return payload
