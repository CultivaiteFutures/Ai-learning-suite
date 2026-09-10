"""Add quiz fields to challenges (grade targeting, MCQ/true-false questions, student answers)

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-02 00:00:00.000000

This migration turns Challenge from "wraps an existing Assignment/Game" into
a self-contained, school-wide, grade-scoped quiz that School Admin authors
directly:
  - challenges.target_grade_ids (JSON list of Grade.id) -- which grades this
    challenge is for; empty/NULL means every grade in the school.
  - challenges.questions (JSON list of question dicts) -- the actual
    multiple-choice / true-false quiz content, each with its own correct
    answer and point value.
  - challenge_participants.answers (JSON list) -- the student's submitted
    answers, so results can be reviewed after auto-grading.

The old course_id/target_type/target_id columns are left in place
(unused by new challenges going forward, per the "replace entirely"
decision) rather than dropped, so no existing data is destroyed.

Written defensively (inspector checks before DDL) per this project's
established migration pattern, so re-running upgrade head is always safe
even if a previous partial run already added one of these columns.
"""
from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    challenge_columns = {c['name'] for c in inspector.get_columns('challenges')}
    if 'target_grade_ids' not in challenge_columns:
        op.add_column('challenges', sa.Column('target_grade_ids', sa.JSON(), nullable=True))
    if 'questions' not in challenge_columns:
        op.add_column('challenges', sa.Column('questions', sa.JSON(), nullable=True))

    participant_columns = {c['name'] for c in inspector.get_columns('challenge_participants')}
    if 'answers' not in participant_columns:
        op.add_column('challenge_participants', sa.Column('answers', sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    participant_columns = {c['name'] for c in inspector.get_columns('challenge_participants')}
    if 'answers' in participant_columns:
        op.drop_column('challenge_participants', 'answers')

    challenge_columns = {c['name'] for c in inspector.get_columns('challenges')}
    if 'questions' in challenge_columns:
        op.drop_column('challenges', 'questions')
    if 'target_grade_ids' in challenge_columns:
        op.drop_column('challenges', 'target_grade_ids')
