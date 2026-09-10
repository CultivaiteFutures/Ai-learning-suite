"""Add assignment fields and user section

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-19 23:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add section to users
    op.add_column('users', sa.Column('section', sa.String(), nullable=True))
    
    # Add answer_key, target_type, target_grade, target_section to assignments
    op.add_column('assignments', sa.Column('answer_key', sa.Text(), nullable=True))
    op.add_column('assignments', sa.Column('target_type', sa.String(), nullable=True, server_default='all'))
    op.add_column('assignments', sa.Column('target_grade', sa.String(), nullable=True))
    op.add_column('assignments', sa.Column('target_section', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('assignments', 'target_section')
    op.drop_column('assignments', 'target_grade')
    op.drop_column('assignments', 'target_type')
    op.drop_column('assignments', 'answer_key')
    op.drop_column('users', 'section')
