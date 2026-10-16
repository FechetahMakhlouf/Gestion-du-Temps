"""widen subtask.day to hold per-timeslot scope ('<day>@<timeslot_id>')

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2026-10-16 07:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'h9i0j1k2l3m4'
down_revision = 'g8h9i0j1k2l3'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('subtask') as batch_op:
        batch_op.alter_column('day', existing_type=sa.String(length=3),
                              type_=sa.String(length=64), existing_nullable=True)


def downgrade():
    with op.batch_alter_table('subtask') as batch_op:
        batch_op.alter_column('day', existing_type=sa.String(length=64),
                              type_=sa.String(length=3), existing_nullable=True)
