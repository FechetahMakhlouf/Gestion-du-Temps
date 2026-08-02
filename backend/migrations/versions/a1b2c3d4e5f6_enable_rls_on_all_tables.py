"""enable RLS on all public tables

Revision ID: a1b2c3d4e5f6
Revises: 7beeead0d9e5
Create Date: 2026-08-02 00:00:00.000000

Fixes the Supabase Advisor "RLS Disabled in Public" critical security warnings.

RLS is a PostgreSQL-only feature; this migration is a no-op on SQLite (used
for local development).  When running against the Supabase PostgreSQL instance
it enables RLS on every application table and adds a RESTRICTIVE deny-all
policy so that the anon / authenticated PostgREST roles cannot access any rows
directly.  The backend's postgres role holds BYPASSRLS and is unaffected.
"""

from alembic import op
from sqlalchemy import text

revision = 'a1b2c3d4e5f6'
down_revision = '7beeead0d9e5'
branch_labels = None
depends_on = None

_TABLES = [
    'user',
    'subject',
    'timeslot',
    'schedule_entry',
    'autogen_config',
    'password_reset_token',
]


def _is_postgresql():
    return op.get_bind().dialect.name == 'postgresql'


def upgrade():
    if not _is_postgresql():
        return  # SQLite (local dev) — nothing to do

    conn = op.get_bind()
    for table in _TABLES:
        policy_name = f"{table}_no_public_access"
        conn.execute(text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))
        conn.execute(text(f'ALTER TABLE public."{table}" FORCE ROW LEVEL SECURITY'))
        conn.execute(text(
            f'CREATE POLICY "{policy_name}"'
            f' ON public."{table}"'
            f' AS RESTRICTIVE FOR ALL TO PUBLIC'
            f' USING (false) WITH CHECK (false)'
        ))


def downgrade():
    if not _is_postgresql():
        return  # SQLite (local dev) — nothing to do

    conn = op.get_bind()
    for table in _TABLES:
        policy_name = f"{table}_no_public_access"
        conn.execute(text(f'DROP POLICY IF EXISTS "{policy_name}" ON public."{table}"'))
        conn.execute(text(f'ALTER TABLE public."{table}" NO FORCE ROW LEVEL SECURITY'))
        conn.execute(text(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY'))
