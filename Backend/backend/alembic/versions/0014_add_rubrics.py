"""Add grading rubrics (Task #46)

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-02 00:00:00.000000

Two new tables (rubrics, rubric_criteria) plus two new columns:
  - assignments.rubric_id -- optional rubric attached at assignment-creation
    time (ON DELETE SET NULL: deleting a rubric un-attaches it rather than
    destroying the assignment).
  - submissions.rubric_scores -- JSON list of {criterion_id, points_awarded,
    comment} recorded when a teacher grades against the attached rubric;
    NULL for a submission graded the old way (a single point total).
"""
from alembic import op
import sqlalchemy as sa

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'rubrics' not in existing_tables:
        op.create_table(
            'rubrics',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if 'rubric_criteria' not in existing_tables:
        op.create_table(
            'rubric_criteria',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('rubric_id', sa.String(), sa.ForeignKey('rubrics.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('max_points', sa.Integer(), nullable=False, server_default='10'),
            sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        )

    assignment_columns = {c['name'] for c in inspector.get_columns('assignments')}
    if 'rubric_id' not in assignment_columns:
        op.add_column('assignments', sa.Column('rubric_id', sa.String(), sa.ForeignKey('rubrics.id', ondelete='SET NULL'), nullable=True))

    submission_columns = {c['name'] for c in inspector.get_columns('submissions')}
    if 'rubric_scores' not in submission_columns:
        op.add_column('submissions', sa.Column('rubric_scores', sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    submission_columns = {c['name'] for c in inspector.get_columns('submissions')}
    if 'rubric_scores' in submission_columns:
        op.drop_column('submissions', 'rubric_scores')

    assignment_columns = {c['name'] for c in inspector.get_columns('assignments')}
    if 'rubric_id' in assignment_columns:
        op.drop_column('assignments', 'rubric_id')

    existing_tables = set(inspector.get_table_names())
    if 'rubric_criteria' in existing_tables:
        op.drop_table('rubric_criteria')
    if 'rubrics' in existing_tables:
        op.drop_table('rubrics')
