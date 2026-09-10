"""Add attendance tracking (Task #45)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-02 00:00:00.000000

One new table: attendance_records, one row per (course, student, date). A
Teacher/Admin marks it via POST /attendance/mark; Student/Parent get
read-only self-scoped views (app/api/v1/student.py, app/api/v1/parent.py);
Admin gets a school-wide overview (app/api/v1/school_admin.py).
"""
from alembic import op
import sqlalchemy as sa

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None

attendance_status_enum = sa.Enum('present', 'absent', 'late', 'excused', name='attendancestatus')


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'attendance_records' not in existing_tables:
        op.create_table(
            'attendance_records',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('course_id', sa.String(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('status', attendance_status_enum, nullable=False, server_default='present'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('marked_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('course_id', 'student_id', 'date', name='uq_attendance_course_student_date'),
        )
        op.create_index('ix_attendance_course_date', 'attendance_records', ['course_id', 'date'])
        op.create_index('ix_attendance_student', 'attendance_records', ['student_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'attendance_records' in existing_tables:
        op.drop_table('attendance_records')
    attendance_status_enum.drop(bind, checkfirst=True)
