"""Add direct 1:1 messaging (conversations + messages)

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-02 00:00:00.000000

Two new tables backing Task #44 (direct messaging between a Teacher and a
Student/Parent they actually have a relationship with -- see
app/api/v1/messaging.py for the eligibility rule):

  - conversations: one durable row per pair of participants, with a unique
    constraint on (user_a_id, user_b_id) so the same pair never gets two
    separate threads. Ids are stored with the lexicographically-smaller
    user id first (enforced in application code, not the DB).
  - messages: one row per message, belonging to a conversation.
"""
from alembic import op
import sqlalchemy as sa

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'conversations' not in existing_tables:
        op.create_table(
            'conversations',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_a_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_b_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('user_a_id', 'user_b_id', name='uq_conversation_pair'),
        )

    if 'messages' not in existing_tables:
        op.create_table(
            'messages',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('conversation_id', sa.String(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('school_id', sa.String(), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=False),
            sa.Column('sender_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_messages_conversation_created', 'messages', ['conversation_id', 'created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'messages' in existing_tables:
        op.drop_table('messages')
    if 'conversations' in existing_tables:
        op.drop_table('conversations')
