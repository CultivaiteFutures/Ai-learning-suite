"""Add school support notes (Task #58)

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'school_support_notes' not in existing_tables:
        op.create_table(
            'school_support_notes',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('author_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('author_name', sa.String(), nullable=True),
            sa.Column('note', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_school_support_notes_school', 'school_support_notes', ['school_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'school_support_notes' in existing_tables:
        op.drop_table('school_support_notes')
