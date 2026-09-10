from app.core.database import engine
from sqlalchemy import inspect, text

insp = inspect(engine)
tables = sorted(insp.get_table_names())
print("TABLES:", tables)
print()

if "assignments" in tables:
    print("assignments columns:", [c["name"] for c in insp.get_columns("assignments")])
print()

with engine.connect() as conn:
    try:
        r = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))"))
        print("userrole enum values:", [row[0] for row in r])
    except Exception as e:
        print("userrole enum check failed:", e)

    try:
        r = conn.execute(text("SELECT version_num FROM alembic_version"))
        print("alembic_version table says:", [row[0] for row in r])
    except Exception as e:
        print("alembic_version check failed:", e)

    try:
        r = conn.execute(text("SELECT name FROM grades LIMIT 20"))
        print("grades rows (first 20):", [row[0] for row in r])
    except Exception as e:
        print("grades check failed:", e)
