import logging

from flask import Blueprint, request
from flask_login import current_user, login_required
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError
from models import db, FreeTask
from utils import json_response

free_tasks_bp = Blueprint('free_tasks', __name__, url_prefix='/api/free-tasks')

logger = logging.getLogger(__name__)

_table_checked = False


def _ensure_table():
    """Create the free_task table on the fly if the migration has not run yet.

    Without this, every free-task request fails with a 500 on a database
    where the migration was never applied.
    """
    global _table_checked
    if _table_checked:
        return
    try:
        if not inspect(db.engine).has_table(FreeTask.__tablename__):
            FreeTask.__table__.create(bind=db.engine, checkfirst=True)
    except SQLAlchemyError:
        logger.exception('Could not ensure free_task table exists')
    else:
        _table_checked = True


@free_tasks_bp.before_request
def _before():
    _ensure_table()


@free_tasks_bp.errorhandler(SQLAlchemyError)
def _db_error(err):
    db.session.rollback()
    logger.exception('Free task database error: %s', err)
    return json_response(
        message="Erreur lors de l'ajout. Réessayez.", status=500)


def _serialize(ft):
    # week_offset is known by the caller; position is implied by list order
    return {'id': ft.id, 'day': ft.day, 'title': ft.title,
            'color': ft.color, 'done': ft.done}


@free_tasks_bp.route('', methods=['GET'])
@login_required
def get_free_tasks():
    """Return free tasks for a week.

    Query params
    ------------
    weekOffset : int   — week to read (default 0)
    day        : str   — single day filter → returns a flat list
    days       : str   — comma-separated days (e.g. ``days=Lun,Mar,Mer``)
                         → returns ONE response bucketed per day:
                         ``{"Lun": [...], "Mar": [...], ...}``

    The ``days`` form replaces the old N-requests-per-week pattern
    (/api/free-tasks?day=Lun, ?day=Mar, …) with a single round-trip.
    """
    day = request.args.get('day', None)
    days_param = request.args.get('days', None)
    try:
        week_offset = int(request.args.get('weekOffset', 0))
    except ValueError:
        week_offset = 0

    query = FreeTask.query.filter_by(
        user_id=current_user.id, week_offset=week_offset)

    # ── multi-day form: one request, bucketed response ────────────────
    if days_param:
        days = [d.strip() for d in days_param.split(',') if d.strip()]
        if days:
            query = query.filter(FreeTask.day.in_(days))
        rows = query.order_by(FreeTask.position).all()

        buckets = {d: [] for d in days}
        for ft in rows:
            buckets.setdefault(ft.day, []).append(_serialize(ft))
        return json_response(buckets)

    # ── single-day / whole-week form ──────────────────────────────────
    if day:
        query = query.filter(FreeTask.day == day)

    tasks = query.order_by(FreeTask.position).all()
    return json_response([_serialize(ft) for ft in tasks])


@free_tasks_bp.route('', methods=['POST'])
@login_required
def add_free_task():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        return json_response(message='Le titre est requis.', status=400)

    day = (data.get('day') or '').strip() or None
    color = (data.get('color') or '#c9972a').strip()
    try:
        week_offset = int(data.get('week_offset', 0))
    except (ValueError, TypeError):
        week_offset = 0

    # Place at end within the same (user, day, week_offset) scope
    max_pos = db.session.query(db.func.max(FreeTask.position)).filter_by(
        user_id=current_user.id, day=day, week_offset=week_offset
    ).scalar() or -1

    ft = FreeTask(
        user_id=current_user.id,
        day=day,
        week_offset=week_offset,
        title=title,
        color=color,
        position=max_pos + 1,
        done=False,
    )
    db.session.add(ft)
    db.session.commit()
    return json_response(_serialize(ft), message='Tâche libre ajoutée', status=201)


@free_tasks_bp.route('/<int:task_id>', methods=['PUT'])
@login_required
def update_free_task(task_id):
    ft = FreeTask.query.filter_by(
        id=task_id, user_id=current_user.id).first_or_404()
    data = request.get_json()

    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return json_response(message='Le titre est requis.', status=400)
        ft.title = title

    if 'color' in data:
        ft.color = data['color']

    if 'done' in data:
        ft.done = bool(data['done'])

    if 'position' in data:
        ft.position = int(data['position'])

    db.session.commit()
    return json_response(_serialize(ft), message='Tâche mise à jour')


@free_tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@login_required
def delete_free_task(task_id):
    ft = FreeTask.query.filter_by(
        id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(ft)
    db.session.commit()
    return json_response(message='Tâche supprimée')


@free_tasks_bp.route('/reorder', methods=['POST'])
@login_required
def reorder_free_tasks():
    """Body: { "order": [id1, id2, ...] }"""
    data = request.get_json()
    order = data.get('order', [])
    for idx, task_id in enumerate(order):
        FreeTask.query.filter_by(
            id=task_id, user_id=current_user.id
        ).update({'position': idx})
    db.session.commit()
    return json_response(message='Ordre mis à jour')
