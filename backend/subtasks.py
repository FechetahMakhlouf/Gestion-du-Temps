from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, Subject, Subtask
from utils import json_response

subtasks_bp = Blueprint('subtasks', __name__, url_prefix='/api/subjects')


@subtasks_bp.route('/<subject_id>/subtasks', methods=['GET'])
@login_required
def get_subtasks(subject_id):
    # Ensure the subject belongs to the current user
    Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()

    # Optional ?day= filter; if omitted, return all subtasks (subjects panel)
    day = request.args.get('day', None)
    query = Subtask.query.filter_by(subject_id=subject_id, user_id=current_user.id)
    if day:
        # Return subtasks scoped to this day, plus legacy rows with no day
        query = query.filter(
            db.or_(Subtask.day == day, Subtask.day == None)  # noqa: E711
        )
    subtasks = query.order_by(Subtask.position).all()

    return json_response([{
        'id': st.id,
        'subject_id': st.subject_id,
        'title': st.title,
        'position': st.position,
        'day': st.day
    } for st in subtasks])


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
    return json_response({
        'id': subtask.id,
        'subject_id': subtask.subject_id,
        'title': subtask.title,
        'position': subtask.position,
        'day': subtask.day
    }, message='Sous-titre ajouté', status=201)


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
    return json_response({
        'id': subtask.id,
        'subject_id': subtask.subject_id,
        'title': subtask.title,
        'position': subtask.position,
        'day': subtask.day
    }, message='Sous-titre modifié')


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
    for idx, subtask_id in enumerate(order):
        Subtask.query.filter_by(
            id=subtask_id, subject_id=subject_id,
            user_id=current_user.id
        ).update({'position': idx})
    db.session.commit()
    return json_response(message='Ordre mis à jour')
