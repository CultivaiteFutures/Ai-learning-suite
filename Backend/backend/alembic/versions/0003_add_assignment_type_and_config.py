"""Add assignment type and config columns

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # These columns exist on the Assignment ORM model (app/models/lms.py) and are read/written
    # by app/api/v1/teacher.py's create_assignment route, but were never added by a migration --
    # a database provisioned purely via `alembic upgrade head` was missing them. Backfill existing
    # rows to the model's defaults so historical assignments don't end up with NULLs the app never expects.
    op.add_column('assignments', sa.Column('type', sa.String(), nullable=True, server_default='Quiz'))
    op.add_column('assignments', sa.Column('config', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('assignments', 'config')
    op.drop_column('assignments', 'type')
