"""cleanup null day subtasks

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-02 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    # Remove all subtasks that have no day assigned.
    # These are legacy rows created before day-scoping was introduced.
    # After this migration, subtasks are strictly per-day and will no
    # longer leak across days in the schedule grid.
    op.execute("DELETE FROM subtask WHERE day IS NULL")


def downgrade():
    # Deleted rows cannot be recovered.
    pass
