"""
Test-suite bootstrap. Runs against a throwaway SQLite file, never the real
Postgres database -- the DATABASE_URL override below MUST happen before any
`app.*` module is imported anywhere in the test process, since
app.core.config.Settings() is only ever instantiated once (at first import)
and app.core.database builds its engine/SessionLocal from that value at
import time too.
"""
import os
os.environ["DATABASE_URL"] = "sqlite:////tmp/test_ai_learning.db"
# Keep the AI providers from ever making a real network call if some future
# test path touches them.
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("CLAUDE_API_KEY", "")

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine, SessionLocal  # noqa: E402  (see override above)


@pytest.fixture(scope="session", autouse=True)
def _test_schema():
    """Fresh schema once per test run, dropped at the end. Never touches the
    real database -- `engine` here is bound to the sqlite file set above."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    db_path = "/tmp/test_ai_learning.db"
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    from app.main import app  # imported lazily, after the DATABASE_URL override above
    with TestClient(app) as c:
        yield c
