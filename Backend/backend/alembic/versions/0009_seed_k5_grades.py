"""seed Kindergarten-Grade 5 rows for existing schools

New schools created after this change get a full K-12 grade roster
automatically (see super_admin.create_school). This migration backfills
the same Kindergarten-through-Grade-5 rows for schools that were created
before that change and only have Grade 6-12 (or fewer).

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

MISSING_GRADES = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"]


def upgrade():
    bind = op.get_bind()

    schools = bind.execute(sa.text("SELECT id FROM schools")).fetchall()
    for (school_id,) in schools:
        existing = {
            row[0]
            for row in bind.execute(
                sa.text("SELECT name FROM grades WHERE school_id = :sid"),
                {"sid": school_id},
            ).fetchall()
        }
        for grade_name in MISSING_GRADES:
            if grade_name in existing:
                continue
            bind.execute(
                sa.text(
                    "INSERT INTO grades (id, school_id, name, code) "
                    "VALUES (:id, :sid, :name, :code)"
                ),
                {"id": str(uuid.uuid4()), "sid": school_id, "name": grade_name, "code": grade_name},
            )


def downgrade():
    bind = op.get_bind()
    for grade_name in MISSING_GRADES:
        bind.execute(sa.text("DELETE FROM grades WHERE name = :name"), {"name": grade_name})
