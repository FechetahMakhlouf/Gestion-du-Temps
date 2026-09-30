"""
/api/bootstrap  — single endpoint that returns all initial app data in one
round-trip so the frontend does not need to fire 6-10 separate requests on
startup.

Response shape
--------------
{
  "data": {
    "user":      { "email": "...", "name": "..." },
    "subjects":  [...],
    "timeslots": [...],
    "days":      [...],
    "schedule":  { "<weekOffset_day_tsId>": "<subjectId>", ... },
    "subtasks":  {
                   "<subjectId>::all": [...],
                   "<subjectId>::<day>": [...],   ← day-scoped pairs from schedule
                   ...
                 },
    "freeTasks": {
                   "0::all": [...],
                   "0::<day>": [...],             ← per-day buckets
                   ...
                 },
    "autogen":   { "<subjectId>": <hours>, ... }
  }
}

The schedule and freeTasks are seeded for week_offset=0 (current week).
The frontend may still call the individual endpoints for other week offsets
or for write operations (POST/PUT/DELETE).
"""

from flask import Blueprint
from flask_login import current_user, login_required
from models import db, Subject, Subtask, Timeslot, ScheduleEntry, AutogenConfig, FreeTask
from utils import json_response
from collections import defaultdict

bootstrap_bp = Blueprint('bootstrap', __name__, url_prefix='/api')


@bootstrap_bp.route('/bootstrap', methods=['GET'])
@login_required
def bootstrap():
    uid = current_user.id

    # ── user ──────────────────────────────────────────────────────────
    user = {
        'email': current_user.email,
        'name': current_user.name,
    }

    # ── subjects ──────────────────────────────────────────────────────
    subjects_rows = Subject.query.filter_by(user_id=uid).all()
    subjects = [
        {'id': s.id, 'name': s.name, 'type': s.type, 'color': s.color}
        for s in subjects_rows
    ]

    # ── timeslots ─────────────────────────────────────────────────────
    timeslots = [
        {'id': t.id, 'start': t.start, 'end': t.end, 'days': t.days or []}
        for t in Timeslot.query.filter_by(user_id=uid).order_by(Timeslot.start).all()
    ]

    # ── active days ───────────────────────────────────────────────────
    days = current_user.active_days or []

    # ── schedule (week 0 only — lazy-loaded per week thereafter) ──────
    week_offset = 0
    schedule = {}
    schedule_entries = ScheduleEntry.query.filter_by(
        user_id=uid, week_offset=week_offset).all()

    # Collect (subject_id, day) pairs that appear in the schedule so we
    # can pre-populate day-scoped subtask buckets below — eliminating the
    # N+1 loop the frontend used to do.
    scheduled_pairs = set()  # {(subject_id, day_abbr), ...}
    for e in schedule_entries:
        key = f"{week_offset}_{e.day}_{e.timeslot_id}"
        schedule[key] = e.subject_id
        scheduled_pairs.add((e.subject_id, e.day))

    # ── subtasks ──────────────────────────────────────────────────────
    # Load ALL subtasks for the user's subjects in a single query.
    # Then bucket them three ways:
    #   "<subjectId>::all"   — full list (used by subjects panel)
    #   "<subjectId>::<day>" — day-scoped (used by schedule grid blocks)
    subtasks: dict = {}
    subject_ids = [s.id for s in subjects_rows]
    if subject_ids:
        all_subtasks = (
            Subtask.query
            .filter(Subtask.user_id == uid,
                    Subtask.subject_id.in_(subject_ids))
            .order_by(Subtask.subject_id, Subtask.position)
            .all()
        )

        # Group into buckets
        all_key_lists: dict = defaultdict(list)
        day_key_lists: dict = defaultdict(list)

        for st in all_subtasks:
            row = {
                'id': st.id,
                'subject_id': st.subject_id,
                'title': st.title,
                'position': st.position,
                'day': st.day,
            }
            all_key_lists[st.subject_id].append(row)
            if st.day:
                day_key_lists[(st.subject_id, st.day)].append(row)

        # Populate "all" buckets
        for sid, rows in all_key_lists.items():
            subtasks[f"{sid}::all"] = rows

        # Populate day-scoped buckets for every scheduled pair so the
        # frontend hits cache instead of firing N individual requests.
        for (sid, day) in scheduled_pairs:
            key = f"{sid}::{day}"
            # Use the already-filtered day list if available, else empty.
            subtasks[key] = day_key_lists.get((sid, day), [])

    # ── free tasks (week 0, all days) ─────────────────────────────────
    # Load all free tasks for week 0 in one query and bucket them:
    #   "<weekOffset>::all"   — complete list
    #   "<weekOffset>::<day>" — per-day bucket (used by schedule grid day columns)
    free_tasks: dict = {}
    ft_rows = (
        FreeTask.query
        .filter_by(user_id=uid, week_offset=week_offset)
        .order_by(FreeTask.position)
        .all()
    )
    if ft_rows:
        all_ft = []
        day_ft: dict = defaultdict(list)

        for ft in ft_rows:
            row = {
                'id': ft.id,
                'day': ft.day,
                'week_offset': ft.week_offset,
                'title': ft.title,
                'color': ft.color,
                'position': ft.position,
                'done': ft.done,
            }
            all_ft.append(row)
            if ft.day:
                day_ft[ft.day].append(row)

        free_tasks[f"{week_offset}::all"] = all_ft
        for day, rows in day_ft.items():
            free_tasks[f"{week_offset}::{day}"] = rows

    # ── autogen config ────────────────────────────────────────────────
    autogen = {
        c.subject_id: c.hours
        for c in AutogenConfig.query.filter_by(user_id=uid).all()
    }

    return json_response({
        'user': user,
        'subjects': subjects,
        'timeslots': timeslots,
        'days': days,
        'schedule': schedule,
        'subtasks': subtasks,
        'freeTasks': free_tasks,
        'autogen': autogen,
    })
