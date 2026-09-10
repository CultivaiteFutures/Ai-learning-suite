"""Add data_deletion_requests table (Task #61: student data export & deletion-on-request)

Revision ID: 0021
Revises: 0020
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0021'
down_revision = '0020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'data_deletion_requests' not in existing_tables:
        op.create_table(
            'data_deletion_requests',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_name', sa.String(), nullable=False),
            sa.Column('requested_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('requested_by_role', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='pending'),
            sa.Column('note', sa.Text(), nullable=True),
            sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('resolved_by_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        )
        op.create_index('ix_data_deletion_requests_school', 'data_deletion_requests', ['school_id'])
        op.create_index('ix_data_deletion_requests_student', 'data_deletion_requests', ['student_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if 'data_deletion_requests' in existing_tables:
        op.drop_table('data_deletion_requests')
