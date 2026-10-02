from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, Subject, Subtask
from utils import json_response
from sqlalchemy import case


def _st(st):
    # Minimal payload: subject_id is known by the caller, position by order
    return {'id': st.id, 'title': st.title, 'day': st.day}

subtasks_bp = Blueprint('subtasks', __name__, url_prefix='/api/subjects')


@subtasks_bp.route('/<subject_id>/subtasks', methods=['GET'])
@login_required
def get_subtasks(subject_id):
    # Ensure the subject belongs to the current user
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()

    # Optional ?day= filter; if omitted, return all subtasks (subjects panel)
    day = request.args.get('day', None)
    query = Subtask.query.filter_by(
        subject_id=subject_id, user_id=current_user.id)
    if day:
        # Return only subtasks scoped strictly to this day
        query = query.filter(Subtask.day == day)
    subtasks = query.order_by(Subtask.position).all()

    return json_response([_st(st) for st in subtasks])


@subtasks_bp.route('/<subject_id>/subtasks', methods=['POST'])
@login_required
def add_subtask(subject_id):
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    data = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        return json_response(message='Le titre est requis.', status=400)

    day = (data.get('day') or '').strip() or None

    # Place at the end within the same (subject, day) scope
    max_pos = db.session.query(db.func.max(Subtask.position)).filter_by(
        subject_id=subject_id, user_id=current_user.id, day=day).scalar() or -1
    position = data.get('position', max_pos + 1)

    subtask = Subtask(
        subject_id=subject_id,
        user_id=current_user.id,
        title=title,
        position=position,
        day=day
    )
    db.session.add(subtask)
    db.session.commit()
    return json_response(_st(subtask), message='Sous-titre ajouté', status=201)


@subtasks_bp.route('/<subject_id>/subtasks/<int:subtask_id>', methods=['PUT'])
@login_required
def update_subtask(subject_id, subtask_id):
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    subtask = Subtask.query.filter_by(
        id=subtask_id, subject_id=subject_id,
        user_id=current_user.id).first_or_404()
    data = request.get_json()

    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return json_response(message='Le titre est requis.', status=400)
        subtask.title = title

    if 'position' in data:
        subtask.position = int(data['position'])

    db.session.commit()
    return json_response(_st(subtask), message='Sous-titre modifié')


@subtasks_bp.route('/<subject_id>/subtasks/<int:subtask_id>', methods=['DELETE'])
@login_required
def delete_subtask(subject_id, subtask_id):
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    subtask = Subtask.query.filter_by(
        id=subtask_id, subject_id=subject_id,
        user_id=current_user.id).first_or_404()
    db.session.delete(subtask)
    db.session.commit()
    return json_response(message='Sous-titre supprimé')


@subtasks_bp.route('/<subject_id>/subtasks/reorder', methods=['POST'])
@login_required
def reorder_subtasks(subject_id):
    """
    Body: { "order": [id1, id2, id3, ...] }
    Assigns position 0,1,2,... in the given order.
    """
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    data = request.get_json()
    order = data.get('order', [])
    try:
        order = [int(x) for x in order]
    except (TypeError, ValueError):
        return json_response(message='order invalide', status=400)
    if order:
        # Single UPDATE ... CASE instead of one UPDATE per row
        Subtask.query.filter(
            Subtask.id.in_(order),
            Subtask.subject_id == subject_id,
            Subtask.user_id == current_user.id,
        ).update({Subtask.position: case(
            {sid: idx for idx, sid in enumerate(order)}, value=Subtask.id)},
            synchronize_session=False)
    db.session.commit()
    return json_response(message='Ordre mis à jour')


# ── Bulk endpoint ─────────────────────────────────────────────────────────────
# GET /api/subtasks?subjectIds=1,2,3[&day=Lun]
#
# Fetches subtasks for N subjects in a SINGLE DB query and returns them
# pre-bucketed with Store-compatible cache keys:
#   { "<subjectId>::<day|all>": [...], ... }
#
# The frontend state.js uses this to seed the cache in one round-trip for
# week offsets that were not covered by /api/bootstrap (which only seeds
# week 0).  This replaces all N+1 patterns of the form:
#   subjects.map(async s => await Store.getSubtasks(s.id, day))
# ─────────────────────────────────────────────────────────────────────────────

subtasks_bulk_bp = Blueprint('subtasks_bulk', __name__, url_prefix='/api')


@subtasks_bulk_bp.route('/subtasks', methods=['GET'])
@login_required
def get_subtasks_bulk():
    """
    Bulk subtask fetch for multiple subjects.

    Query params:
      subjectIds — comma-separated subject IDs  (required)
      day        — optional day abbreviation filter (e.g. "Lun")

    Response: { "<subjectId>::<day|all>": [subtask, ...], ... }
    """
    raw = request.args.get('subjectIds', '')
    day = request.args.get('day', None) or None

    subject_ids = [x.strip() for x in raw.split(',') if x.strip()][:200]

    if not subject_ids:
        return json_response({})

    # Single DB round-trip for all requested subjects
    q = db.session.query(Subtask.id, Subtask.subject_id,
                         Subtask.title, Subtask.day).filter(
        Subtask.user_id == current_user.id,
        Subtask.subject_id.in_(subject_ids)
    )
    if day:
        q = q.filter(Subtask.day == day)
    rows = q.order_by(Subtask.subject_id, Subtask.position).all()

    bucket_suffix = day if day else 'all'
    result = {}
    for st in rows:
        key = f"{st.subject_id}::{bucket_suffix}"
        result.setdefault(key, []).append(_st(st))

    # Guarantee an entry for every requested subject (even when empty)
    for sid in subject_ids:
        result.setdefault(f"{sid}::{bucket_suffix}", [])

    return json_response(result)
