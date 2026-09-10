"""Drop creative_projects table (Creative Lab / Creative Submissions removed)

Revision ID: 0027
Revises: 0026
Create Date: 2026-09-08 00:00:00.000000

The Creative Lab (student) / Creative Submissions (teacher) feature has been
removed from the app entirely -- no more model, schema, endpoints, or UI
reference it. Dropping the table rather than leaving it orphaned.
"""
from alembic import op
import sqlalchemy as sa

revision = '0027'
down_revision = '0026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'creative_projects' in existing_tables:
        op.drop_table('creative_projects')


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'creative_projects' not in existing_tables:
        op.create_table(
            'creative_projects',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('school_id', sa.String(), nullable=False),
            sa.Column('course_id', sa.String(), nullable=True),
            sa.Column('student_id', sa.String(), nullable=False),
            sa.Column('project_type', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('prompt_used', sa.Text(), nullable=True),
            sa.Column('content', sa.Text(), nullable=True),
            sa.Column('ai_assisted', sa.Boolean(), nullable=True, default=False),
            sa.Column('is_shared', sa.Boolean(), nullable=True, default=False),
            sa.Column('status', sa.String(), nullable=True, default='draft'),
            sa.Column('teacher_feedback', sa.Text(), nullable=True),
            sa.Column('reviewed_by_id', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
