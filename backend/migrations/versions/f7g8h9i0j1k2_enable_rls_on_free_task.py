"""enable RLS on free_task

Revision ID: f7g8h9i0j1k2
Revises: e5f6a7b8c9d0
"""

from alembic import op
from sqlalchemy import text

revision = "f7g8h9i0j1k2"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name != "postgresql":
        return

    conn = op.get_bind()

    conn.execute(text(
        "ALTER TABLE public.free_task ENABLE ROW LEVEL SECURITY"
    ))

    conn.execute(text(
        "ALTER TABLE public.free_task FORCE ROW LEVEL SECURITY"
    ))

    policy_exists = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'free_task'
              AND policyname = 'free_task_no_public_access'
        )
    """)).scalar()

    if not policy_exists:
        conn.execute(text("""
            CREATE POLICY "free_task_no_public_access"
            ON public.free_task
            AS RESTRICTIVE
            FOR ALL
            TO PUBLIC
            USING (false)
            WITH CHECK (false)
        """))


def downgrade():
    if op.get_bind().dialect.name != "postgresql":
        return

    conn = op.get_bind()

    conn.execute(text(
        'DROP POLICY IF EXISTS "free_task_no_public_access" '
        'ON public.free_task'
    ))

    conn.execute(text(
        "ALTER TABLE public.free_task NO FORCE ROW LEVEL SECURITY"
    ))

    conn.execute(text(
        "ALTER TABLE public.free_task DISABLE ROW LEVEL SECURITY"
    ))
