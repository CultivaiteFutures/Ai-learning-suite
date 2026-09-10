"""Add sso_configurations table (Task #62: SSO scaffolding)

Revision ID: 0022
Revises: 0021
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0022'
down_revision = '0021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'sso_configurations' not in existing_tables:
        op.create_table(
            'sso_configurations',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('provider', sa.String(), nullable=False),
            sa.Column('is_enabled', sa.Boolean(), server_default=sa.false()),
            sa.Column('client_id', sa.String(), nullable=True),
            sa.Column('client_secret', sa.String(), nullable=True),
            sa.Column('domain_restriction', sa.String(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.UniqueConstraint('school_id', 'provider', name='uq_sso_school_provider'),
        )
        op.create_index('ix_sso_configurations_school', 'sso_configurations', ['school_id'])
        op.create_index('ix_sso_configurations_domain', 'sso_configurations', ['domain_restriction'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'sso_configurations' in existing_tables:
        op.drop_table('sso_configurations')
