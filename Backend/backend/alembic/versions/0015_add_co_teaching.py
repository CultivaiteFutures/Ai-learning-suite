"""Add co-teaching (shared course ownership) - Task #47

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-02 00:00:00.000000

One new table, course_teachers: grants a teacher other than the course's
`created_by_id` the same manage rights on that course (see
app/services/course_ownership.py's can_manage_course, and
app/api/v1/teacher.py's co-teacher endpoints).
"""
from alembic import op
import sqlalchemy as sa

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'course_teachers' not in existing_tables:
        op.create_table(
            'course_teachers',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('teacher_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('course_id', 'teacher_id', name='uq_course_teacher_pair'),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'course_teachers' in existing_tables:
        op.drop_table('course_teachers')
