"""
Regression tests for Task #62 (SSO scaffolding): config CRUD is admin-only
and school-scoped, the pre-login lookup never reveals more than "is SSO on
for this domain", /start refuses to build an authorization URL until real
credentials are configured (and builds a correct one once they are), and
the callback's error paths and success path (with the network calls
monkeypatched, same pattern used for AI endpoint tests) work end-to-end.
"""
from urllib.parse import urlparse, parse_qs

from app.models.user import UserRole
from app.models.sso_config import SSOConfiguration
from app.core.security import create_sso_state_token
from factories import make_school, make_user, auth_headers


def test_sso_config_defaults_to_three_disabled_providers(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.get("/api/v1/school-admin/sso-config", headers=auth_headers(admin))
    assert res.status_code == 200
    data = res.json()
    assert {r["provider"] for r in data} == {"google", "clever", "classlink"}
    assert all(r["isEnabled"] is False and r["hasSecret"] is False for r in data)


def test_admin_can_configure_sso_and_secret_is_never_returned(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    res = client.put(
        "/api/v1/school-admin/sso-config/google",
        headers=auth_headers(admin),
        json={"isEnabled": True, "clientId": "real-client-id-123", "clientSecret": "shh-secret-value", "domainRestriction": "Test.School"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["isEnabled"] is True
    assert body["hasSecret"] is True
    assert "clientSecret" not in body and "client_secret" not in body
    assert body["domainRestriction"] == "test.school"  # normalized to lowercase

    config = db.query(SSOConfiguration).filter(SSOConfiguration.school_id == school.id, SSOConfiguration.provider == "google").first()
    assert config.client_secret == "shh-secret-value"


def test_unknown_provider_rejected(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    res = client.put("/api/v1/school-admin/sso-config/facebook", headers=auth_headers(admin), json={"isEnabled": True})
    assert res.status_code == 404


def test_provider_lookup_only_returns_configured_and_enabled(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    client.put(
        "/api/v1/school-admin/sso-config/google",
        headers=auth_headers(admin),
        json={"isEnabled": True, "clientId": "real-client-id-123", "clientSecret": "shh-secret-value", "domainRestriction": "sso-school.edu"},
    )
    # Clever configured but left disabled -- should not show up.
    client.put(
        "/api/v1/school-admin/sso-config/clever",
        headers=auth_headers(admin),
        json={"isEnabled": False, "clientId": "clever-id-123", "clientSecret": "clever-secret-123", "domainRestriction": "sso-school.edu"},
    )

    res = client.get("/api/v1/sso/providers", params={"email": "student@sso-school.edu"})
    assert res.status_code == 200
    providers = [p["provider"] for p in res.json()["providers"]]
    assert providers == ["google"]

    # A domain with no SSO configured at all gets an empty list, not an error.
    res2 = client.get("/api/v1/sso/providers", params={"email": "someone@unrelated-domain.edu"})
    assert res2.status_code == 200
    assert res2.json()["providers"] == []


def test_start_refuses_when_not_configured_and_builds_url_when_configured(client, db):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)

    # Not configured at all yet.
    res = client.get("/api/v1/sso/google/start", params={"email": "student@nowhere.edu"})
    assert res.status_code == 400

    client.put(
        "/api/v1/school-admin/sso-config/google",
        headers=auth_headers(admin),
        json={"isEnabled": True, "clientId": "real-client-id-123", "clientSecret": "shh-secret-value", "domainRestriction": "sso-school.edu"},
    )
    res2 = client.get("/api/v1/sso/google/start", params={"email": "student@sso-school.edu"})
    assert res2.status_code == 200
    auth_url = res2.json()["authorization_url"]
    parsed = urlparse(auth_url)
    assert parsed.netloc == "accounts.google.com"
    qs = parse_qs(parsed.query)
    assert qs["client_id"][0] == "real-client-id-123"
    assert qs["response_type"][0] == "code"
    assert "state" in qs

    # Unknown provider name -> 404, not a 400/500.
    assert client.get("/api/v1/sso/facebook/start", params={"email": "x@sso-school.edu"}).status_code == 404


def test_callback_error_paths_redirect_with_reason(client, db):
    res = client.get("/api/v1/sso/google/callback", params={"error": "access_denied"}, follow_redirects=False)
    assert res.status_code in (302, 307)
    assert "ssoError=access_denied" in res.headers["location"]

    res2 = client.get("/api/v1/sso/google/callback", follow_redirects=False)  # no code/state at all
    assert "ssoError=invalid_request" in res2.headers["location"]

    res3 = client.get("/api/v1/sso/google/callback", params={"code": "abc", "state": "not-a-real-jwt"}, follow_redirects=False)
    assert "ssoError=invalid_or_expired_state" in res3.headers["location"]


def test_callback_success_issues_a_working_token(client, db, monkeypatch):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    student = make_user(db, school, UserRole.STUDENT, email="sso.kid@sso-school.edu")

    client.put(
        "/api/v1/school-admin/sso-config/google",
        headers=auth_headers(admin),
        json={"isEnabled": True, "clientId": "real-client-id-123", "clientSecret": "shh-secret-value", "domainRestriction": "sso-school.edu"},
    )

    state = create_sso_state_token(provider="google", school_id=school.id, domain="sso-school.edu")

    monkeypatch.setattr("app.services.sso_service.exchange_code_for_token", lambda *a, **k: {"access_token": "fake-provider-token"})
    monkeypatch.setattr("app.services.sso_service.fetch_userinfo", lambda *a, **k: {"email": "sso.kid@sso-school.edu"})

    res = client.get("/api/v1/sso/google/callback", params={"code": "real-code", "state": state}, follow_redirects=False)
    assert res.status_code in (302, 307)
    location = res.headers["location"]
    assert location.startswith("http://localhost:5173/sso-callback?token=")
    issued_token = location.split("token=", 1)[1]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {issued_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == student.email


def test_callback_unknown_email_does_not_auto_provision(client, db, monkeypatch):
    school = make_school(db)
    admin = make_user(db, school, UserRole.ADMIN)
    client.put(
        "/api/v1/school-admin/sso-config/google",
        headers=auth_headers(admin),
        json={"isEnabled": True, "clientId": "real-client-id-123", "clientSecret": "shh-secret-value", "domainRestriction": "sso-school.edu"},
    )
    state = create_sso_state_token(provider="google", school_id=school.id, domain="sso-school.edu")

    monkeypatch.setattr("app.services.sso_service.exchange_code_for_token", lambda *a, **k: {"access_token": "fake-provider-token"})
    monkeypatch.setattr("app.services.sso_service.fetch_userinfo", lambda *a, **k: {"email": "nobody@sso-school.edu"})

    res = client.get("/api/v1/sso/google/callback", params={"code": "real-code", "state": state}, follow_redirects=False)
    assert "ssoError=account_not_found" in res.headers["location"]
