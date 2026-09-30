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
    "subtasks":  { "<subjectId>::all": [...], ... },
    "freeTasks": { "0::all": [...] },
    "autogen":   { "<subjectId>": <hours>, ... }
  }
}

The schedule and freeTasks are seeded for week_offset=0 (current week).
The frontend may still call the individual endpoints for other week offsets
or for day-scoped subtask / free-task requests.
"""

from flask import Blueprint
from flask_login import current_user, login_required
from models import db, Subject, Subtask, Timeslot, ScheduleEntry, AutogenConfig, FreeTask
from utils import json_response

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
    for e in ScheduleEntry.query.filter_by(user_id=uid, week_offset=week_offset).all():
        key = f"{week_offset}_{e.day}_{e.timeslot_id}"
        schedule[key] = e.subject_id

    # ── subtasks (all subjects, no day filter — same as subjects panel) ─
    subtasks = {}
    subject_ids = [s.id for s in subjects_rows]
    if subject_ids:
        all_subtasks = (
            Subtask.query
            .filter(Subtask.user_id == uid,
                    Subtask.subject_id.in_(subject_ids))
            .order_by(Subtask.subject_id, Subtask.position)
            .all()
        )
        # Group by subject under the "all" key so Store.getSubtasks(id) hits cache
        for st in all_subtasks:
            key = f"{st.subject_id}::all"
            subtasks.setdefault(key, []).append({
                'id': st.id,
                'subject_id': st.subject_id,
                'title': st.title,
                'position': st.position,
                'day': st.day,
            })

    # ── free tasks (week 0, no day filter) ────────────────────────────
    free_tasks = {}
    ft_rows = (
        FreeTask.query
        .filter_by(user_id=uid, week_offset=week_offset)
        .order_by(FreeTask.position)
        .all()
    )
    if ft_rows:
        free_tasks[f"{week_offset}::all"] = [
            {
                'id': ft.id,
                'day': ft.day,
                'week_offset': ft.week_offset,
                'title': ft.title,
                'color': ft.color,
                'position': ft.position,
                'done': ft.done,
            }
            for ft in ft_rows
        ]

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
