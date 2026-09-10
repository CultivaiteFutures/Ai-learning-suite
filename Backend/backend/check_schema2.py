from app.core.database import engine
from sqlalchemy import inspect, text

insp = inspect(engine)

print("users columns:", [c["name"] for c in insp.get_columns("users")])
print()
print("modules columns:", [c["name"] for c in insp.get_columns("modules")])
print()
print("notifications indexes:", [ix["name"] for ix in insp.get_indexes("notifications")])
print()
print("parent_student_links columns:", [c["name"] for c in insp.get_columns("parent_student_links")])
print("parent_student_links indexes:", [ix["name"] for ix in insp.get_indexes("parent_student_links")])
