"""
Task #62: SSO scaffolding for Google / Clever / ClassLink.

This builds a real OAuth 2.0 Authorization Code flow -- correct
authorization URLs, a real token exchange, and real userinfo lookups --
against each provider's actual endpoints. It is "inert" only in the sense
the product roadmap means: with no client_id/client_secret configured for
a school, is_configured() is False and the API layer (app/api/v1/sso.py)
refuses to start a flow, rather than sending a browser to an OAuth screen
that would fail. Once a School Admin enters real credentials issued by
that provider (and registers this app's redirect_uri with them), the exact
same code path performs a working login.
"""
from typing import Optional
from urllib.parse import urlencode

import httpx

PROVIDERS = {
    "google": {
        "label": "Google",
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "clever": {
        "label": "Clever",
        "authorize_url": "https://clever.com/oauth/authorize",
        "token_url": "https://clever.com/oauth/tokens",
        "userinfo_url": "https://api.clever.com/v3.0/me",
        # Clever's /me only returns an id + type for student accounts (COPPA);
        # a production integration would follow up with the type-specific
        # endpoint (e.g. /v3.0/students/{id}) to get contact info such as email.
        # Scaffolding stops at the generic /me call.
        "scope": "read:user_id read:students read:teachers read:sis",
    },
    "classlink": {
        "label": "ClassLink",
        "authorize_url": "https://launchpad.classlink.com/oauth2/v2/auth",
        "token_url": "https://launchpad.classlink.com/oauth2/v2/token",
        "userinfo_url": "https://nodeapi.classlink.com/v2/my/info",
        "scope": "profile",
    },
}


def is_configured(config) -> bool:
    """True only when a School Admin has entered a real-looking client_id
    and client_secret and turned the provider on -- the single gate every
    SSO route checks before doing anything else."""
    return bool(
        config
        and config.is_enabled
        and config.client_id
        and config.client_secret
        and len(config.client_id.strip()) > 5
        and len(config.client_secret.strip()) > 5
    )


def build_authorization_url(provider: str, config, redirect_uri: str, state: str) -> str:
    meta = PROVIDERS[provider]
    params = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": meta["scope"],
        "state": state,
    }
    return f"{meta['authorize_url']}?{urlencode(params)}"


def exchange_code_for_token(provider: str, config, code: str, redirect_uri: str) -> dict:
    """Real HTTP call to the provider's token endpoint. Callers in tests
    monkeypatch this function rather than mocking httpx, mirroring how the
    AI endpoints are tested without a live network call."""
    meta = PROVIDERS[provider]
    resp = httpx.post(
        meta["token_url"],
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        headers={"Accept": "application/json"},
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_userinfo(provider: str, access_token: str) -> dict:
    """Real HTTP call to the provider's userinfo endpoint. See
    exchange_code_for_token's docstring re: test monkeypatching."""
    meta = PROVIDERS[provider]
    resp = httpx.get(
        meta["userinfo_url"],
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def extract_email(provider: str, userinfo: dict) -> Optional[str]:
    if provider == "google":
        return userinfo.get("email")
    if provider == "clever":
        return userinfo.get("email") or (userinfo.get("data") or {}).get("email")
    if provider == "classlink":
        return userinfo.get("Email") or userinfo.get("email")
    return None
