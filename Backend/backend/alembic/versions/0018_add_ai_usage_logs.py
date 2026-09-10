"""Add AI usage/cost metering logs (Task #56)

Revision ID: 0018
Revises: 0017
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'ai_usage_logs' not in existing_tables:
        op.create_table(
            'ai_usage_logs',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('feature', sa.String(), nullable=False),
            sa.Column('provider', sa.String(), nullable=True),
            sa.Column('estimated_tokens', sa.Integer(), default=0),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_ai_usage_logs_school', 'ai_usage_logs', ['school_id'])
        op.create_index('ix_ai_usage_logs_created_at', 'ai_usage_logs', ['created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'ai_usage_logs' in existing_tables:
        op.drop_table('ai_usage_logs')
