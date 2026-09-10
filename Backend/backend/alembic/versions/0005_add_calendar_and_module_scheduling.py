"""Add calendar_events table, modules.publish_at, and modules.prerequisite_module_id

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Academic Calendar: school-wide (course_id NULL) or course-scoped calendar event
    # (holiday, exam, deadline, generic event, ...).
    op.create_table(
        'calendar_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('school_id', sa.String(), nullable=False),
        sa.Column('course_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('event_type', sa.String(), nullable=True, default='event'),
        sa.Column('created_by_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Scheduled Module Release: NULL = always visible (backward compatible default);
    # a future datetime hides the module from students until it passes.
    op.add_column('modules', sa.Column('publish_at', sa.DateTime(timezone=True), nullable=True))

    # Module Prerequisites: another module in the SAME course that must be completed
    # (all its lessons marked complete) before this one unlocks. Self-referential FK.
    op.add_column('modules', sa.Column('prerequisite_module_id', sa.String(), nullable=True))
    with op.batch_alter_table('modules') as batch_op:
        batch_op.create_foreign_key(
            'fk_modules_prerequisite_module_id', 'modules', ['prerequisite_module_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('modules') as batch_op:
        batch_op.drop_constraint('fk_modules_prerequisite_module_id', type_='foreignkey')
    op.drop_column('modules', 'prerequisite_module_id')
    op.drop_column('modules', 'publish_at')
    op.drop_table('calendar_events')
