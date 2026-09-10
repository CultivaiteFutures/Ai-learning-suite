"""Add complaints table (School Admin -> Super Admin support tickets)

Revision ID: 0024
Revises: 0023
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'complaints' not in existing_tables:
        op.create_table(
            'complaints',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('submitted_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('submitted_by_name', sa.String(), nullable=True),
            sa.Column('subject', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('status', sa.String(), nullable=False, server_default='OPEN'),
            sa.Column('resolution_note', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('ix_complaints_school', 'complaints', ['school_id'])
        op.create_index('ix_complaints_status', 'complaints', ['status'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'complaints' in existing_tables:
        op.drop_table('complaints')
