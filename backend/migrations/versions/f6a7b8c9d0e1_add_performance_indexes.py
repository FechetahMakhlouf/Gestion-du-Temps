"""add performance indexes on frequently filtered / joined columns

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None

INDEXES = [
    ('ix_subject_user_id', 'subject', ['user_id']),
    ('ix_subtask_user_subject_pos', 'subtask', ['user_id', 'subject_id', 'position']),
    ('ix_subtask_subject_day', 'subtask', ['subject_id', 'day']),
    ('ix_timeslot_user_start', 'timeslot', ['user_id', 'start']),
    ('ix_schedule_entry_subject_id', 'schedule_entry', ['subject_id']),
    ('ix_schedule_entry_timeslot_id', 'schedule_entry', ['timeslot_id']),
    ('ix_schedule_entry_user_subject', 'schedule_entry', ['user_id', 'subject_id']),
    ('ix_free_task_user_week_day_pos', 'free_task', ['user_id', 'week_offset', 'day', 'position']),
    ('ix_autogen_config_subject_id', 'autogen_config', ['subject_id']),
    ('ix_password_reset_token_user_id', 'password_reset_token', ['user_id']),
]


def upgrade():
    insp = sa.inspect(op.get_bind())
    for name, table, cols in INDEXES:
        if not insp.has_table(table):
            continue
        existing = {i['name'] for i in insp.get_indexes(table)}
        if name not in existing:
            op.create_index(name, table, cols)


def downgrade():
    insp = sa.inspect(op.get_bind())
    for name, table, _ in INDEXES:
        if insp.has_table(table) and name in {i['name'] for i in insp.get_indexes(table)}:
            op.drop_index(name, table_name=table)
