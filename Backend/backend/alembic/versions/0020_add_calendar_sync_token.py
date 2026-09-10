"""Add calendar_sync_token to users, for ICS calendar export/subscription (Task #59)

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c['name'] for c in inspector.get_columns('users')}

    if 'calendar_sync_token' not in existing_columns:
        op.add_column('users', sa.Column('calendar_sync_token', sa.String(), nullable=True))
        op.create_index('ix_users_calendar_sync_token', 'users', ['calendar_sync_token'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c['name'] for c in inspector.get_columns('users')}
    if 'calendar_sync_token' in existing_columns:
        op.drop_index('ix_users_calendar_sync_token', table_name='users')
        op.drop_column('users', 'calendar_sync_token')
