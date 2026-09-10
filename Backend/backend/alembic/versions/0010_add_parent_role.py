"""add PARENT role and parent_student_links table

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    # Postgres native enum: adding a value must run outside the migration's
    # implicit transaction block (ALTER TYPE ... ADD VALUE cannot execute
    # inside a transaction that also uses the new value, and older Postgres
    # disallows it in a transaction at all). autocommit_block() is alembic's
    # documented way to do this safely.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PARENT'")

    # This project's app also calls Base.metadata.create_all() on every
    # backend startup, which auto-creates any brand-new table for a model
    # that's been defined/imported -- so by the time this migration actually
    # runs, a dev who has already restarted the backend with the
    # ParentStudentLink model in place may already have this table (with the
    # right columns, but without the unique index below, since that's only
    # declared here in the migration, not on the model). Guard both steps so
    # this migration is safe to run whether or not that already happened.
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'parent_student_links' not in inspector.get_table_names():
        op.create_table(
            'parent_student_links',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('parent_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        )
        inspector = sa.inspect(bind)

    existing_indexes = {ix['name'] for ix in inspector.get_indexes('parent_student_links')}
    if 'ix_parent_student_links_unique_pair' not in existing_indexes:
        op.create_index(
            'ix_parent_student_links_unique_pair',
            'parent_student_links',
            ['parent_id', 'student_id'],
            unique=True,
        )


def downgrade():
    op.drop_index('ix_parent_student_links_unique_pair', table_name='parent_student_links')
    op.drop_table('parent_student_links')
    # Postgres has no ALTER TYPE ... DROP VALUE; leaving the enum value in
    # place on downgrade is the standard accepted tradeoff for this pattern.
