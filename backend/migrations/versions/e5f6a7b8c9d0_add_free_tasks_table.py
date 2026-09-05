"""add free_tasks table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if sa.inspect(bind).has_table('free_task'):
        return  # table already created at runtime

    op.create_table(
        'free_task',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('day', sa.String(length=3), nullable=True),
        sa.Column('week_offset', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#c9972a'),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('done', sa.Boolean(), nullable=True, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_free_task_user_day', 'free_task', ['user_id', 'day', 'week_offset'])


def downgrade():
    bind = op.get_bind()
    if not sa.inspect(bind).has_table('free_task'):
        return

    op.drop_index('ix_free_task_user_day', table_name='free_task')
    op.drop_table('free_task')
