"""
Task #62: SSO scaffolding -- public (pre-login) routes for Google/Clever/
ClassLink single sign-on. See app/services/sso_service.py for why this is
"scaffolding" rather than a stub: the OAuth flow itself is real, it is
just gated shut until a School Admin configures real provider credentials
(app/api/v1/school_admin.py's /sso-config routes).
"""
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, create_sso_state_token, decode_sso_state_token
from app.models.user import User
from app.models.sso_config import SSOConfiguration
from app.models.platform import ActivityLog
from app.services import sso_service

router = APIRouter()


def _domain_of(email: str):
    email = (email or "").strip().lower()
    return email.split("@")[-1] if "@" in email else None


@router.get("/providers")
def lookup_sso_providers(email: str = Query(...), db: Session = Depends(get_db)):
    """
    Public, pre-login lookup: given the email a person is about to sign in
    with, returns which SSO providers (if any) are enabled and fully
    configured for that email's school, so the login page can offer the
    right button. Reveals only whether a domain has SSO configured, never
    whether the specific email has an account.
    """
    domain = _domain_of(email)
    if not domain:
        return {"providers": []}

    configs = db.query(SSOConfiguration).filter(
        SSOConfiguration.domain_restriction == domain,
        SSOConfiguration.is_enabled == True,  # noqa: E712
    ).all()
    return {
        "providers": [
            {"provider": c.provider, "label": sso_service.PROVIDERS[c.provider]["label"]}
            for c in configs if sso_service.is_configured(c)
        ]
    }


@router.get("/{provider}/start")
def start_sso_login(provider: str, email: str = Query(...), db: Session = Depends(get_db)):
    """Builds a real authorization URL for the frontend to redirect the browser to."""
    if provider not in sso_service.PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown SSO provider")

    domain = _domain_of(email)
    config = (
        db.query(SSOConfiguration)
        .filter(SSOConfiguration.domain_restriction == domain, SSOConfiguration.provider == provider)
        .first()
        if domain else None
    )
    if not sso_service.is_configured(config):
        raise HTTPException(
            status_code=400,
            detail=f"{sso_service.PROVIDERS[provider]['label']} sign-in isn't configured for this school yet.",
        )

    redirect_uri = f"{settings.PUBLIC_API_BASE_URL}{settings.API_V1_STR}/sso/{provider}/callback"
    state = create_sso_state_token(provider=provider, school_id=config.school_id, domain=domain)
    return {"authorization_url": sso_service.build_authorization_url(provider, config, redirect_uri, state)}


@router.get("/{provider}/callback")
def sso_callback(provider: str, code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    """
    The identity provider redirects the browser here after the user
    approves (or denies) access. Always ends in a redirect back to the
    frontend -- either to /sso-callback?token=... on success, or to
    /login?ssoError=... on any failure -- since this endpoint is loaded
    directly by the browser, not called via fetch/axios.
    """
    def fail(reason: str):
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?ssoError={reason}")

    if error:
        return fail("access_denied")
    if provider not in sso_service.PROVIDERS or not code or not state:
        return fail("invalid_request")

    try:
        state_payload = decode_sso_state_token(state)
    except (jwt.PyJWTError, ValueError):
        return fail("invalid_or_expired_state")

    if state_payload.get("provider") != provider:
        return fail("invalid_state")

    config = db.query(SSOConfiguration).filter(
        SSOConfiguration.school_id == state_payload["school_id"], SSOConfiguration.provider == provider
    ).first()
    if not sso_service.is_configured(config):
        return fail("provider_not_configured")

    redirect_uri = f"{settings.PUBLIC_API_BASE_URL}{settings.API_V1_STR}/sso/{provider}/callback"
    try:
        token_data = sso_service.exchange_code_for_token(provider, config, code, redirect_uri)
        access_token = token_data.get("access_token")
        if not access_token:
            return fail("token_exchange_failed")
        userinfo = sso_service.fetch_userinfo(provider, access_token)
    except Exception:
        # Any network/provider-side failure -- never surface provider internals to the browser.
        return fail("provider_error")

    email = sso_service.extract_email(provider, userinfo)
    if not email:
        return fail("email_not_provided")

    user = db.query(User).filter(User.email == email.lower(), User.school_id == config.school_id).first()
    if not user:
        # Deliberately does not auto-provision an account: a real IdP login
        # should never be able to create platform access on its own --
        # a School Admin must have created the account first.
        return fail("account_not_found")
    if not user.is_active:
        return fail("account_inactive")

    jwt_token = create_access_token(
        subject=user.id,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        school_id=user.school_id,
    )

    try:
        db.add(ActivityLog(
            school_id=user.school_id, user_id=user.id, user_name=user.full_name,
            action="LOGIN_SUCCESS", details=f"{user.full_name} signed in via {sso_service.PROVIDERS[provider]['label']} SSO",
        ))
        db.commit()
    except Exception:
        db.rollback()

    return RedirectResponse(url=f"{settings.FRONTEND_URL}/sso-callback?token={jwt_token}")
