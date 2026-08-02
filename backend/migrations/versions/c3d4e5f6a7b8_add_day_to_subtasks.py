"""add day column to subtask

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'subtask',
        sa.Column('day', sa.String(length=3), nullable=True, server_default=None)
    )
    op.create_index('ix_subtask_subject_day', 'subtask', ['subject_id', 'day'])


def downgrade():
    op.drop_index('ix_subtask_subject_day', table_name='subtask')
    op.drop_column('subtask', 'day')
