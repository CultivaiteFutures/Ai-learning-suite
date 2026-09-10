"""Drop standards / content_standard_tags tables (Standards module removed)

Revision ID: 0026
Revises: 0025
Create Date: 2026-09-03 00:00:00.000000

The Standards / curriculum-alignment-tagging feature (added in 0016) has
been removed from the app entirely -- no more model, schema, endpoints, or
UI reference it. Dropping both tables rather than leaving them orphaned.
"""
from alembic import op
import sqlalchemy as sa

revision = '0026'
down_revision = '0025'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'content_standard_tags' in existing_tables:
        op.drop_table('content_standard_tags')
    if 'standards' in existing_tables:
        op.drop_table('standards')


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'standards' not in existing_tables:
        op.create_table(
            'standards',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('code', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('subject', sa.String(), nullable=True),
            sa.Column('created_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
    if 'content_standard_tags' not in existing_tables:
        op.create_table(
            'content_standard_tags',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('standard_id', sa.String(), sa.ForeignKey('standards.id', ondelete='CASCADE'), nullable=False),
            sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=True),
            sa.Column('assignment_id', sa.String(), sa.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
