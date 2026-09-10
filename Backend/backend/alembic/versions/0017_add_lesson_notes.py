"""Add lesson notes / highlights / bookmarks (Task #50)

Revision ID: 0017
Revises: 0016
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'lesson_notes' not in existing_tables:
        op.create_table(
            'lesson_notes',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('lesson_id', sa.String(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
            sa.Column('notes_text', sa.Text(), nullable=True),
            sa.Column('highlights', sa.JSON(), nullable=True),
            sa.Column('is_bookmarked', sa.Boolean(), default=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('student_id', 'lesson_id', name='uq_lesson_notes_student_lesson'),
        )
        op.create_index('ix_lesson_notes_student', 'lesson_notes', ['student_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'lesson_notes' in existing_tables:
        op.drop_table('lesson_notes')
