"""Add platform_settings table (Super Admin maintenance mode)

Revision ID: 0023
Revises: 0022
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'platform_settings' not in existing_tables:
        op.create_table(
            'platform_settings',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('maintenance_mode', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('maintenance_message', sa.String(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'platform_settings' in existing_tables:
        op.drop_table('platform_settings')
