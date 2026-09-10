"""Add platform_name/support_email to platform_settings (General settings)

Revision ID: 0025
Revises: 0024
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0025'
down_revision = '0024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'platform_settings' not in inspector.get_table_names():
        return
    existing_cols = {c['name'] for c in inspector.get_columns('platform_settings')}

    if 'platform_name' not in existing_cols:
        op.add_column(
            'platform_settings',
            sa.Column('platform_name', sa.String(), nullable=False, server_default='AI Learning Suite'),
        )
    if 'support_email' not in existing_cols:
        op.add_column('platform_settings', sa.Column('support_email', sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'platform_settings' not in inspector.get_table_names():
        return
    existing_cols = {c['name'] for c in inspector.get_columns('platform_settings')}
    if 'support_email' in existing_cols:
        op.drop_column('platform_settings', 'support_email')
    if 'platform_name' in existing_cols:
        op.drop_column('platform_settings', 'platform_name')
