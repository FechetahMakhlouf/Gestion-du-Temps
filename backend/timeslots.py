from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, Timeslot, ScheduleEntry
from utils import json_response
import time

timeslots_bp = Blueprint('timeslots', __name__, url_prefix='/api/timeslots')


@timeslots_bp.route('', methods=['GET'])
@login_required
def get_timeslots():
    ts = Timeslot.query.filter_by(
        user_id=current_user.id).order_by(Timeslot.start).all()
    return json_response([{'id': t.id, 'start': t.start, 'end': t.end, 'days': t.days or []} for t in ts])


@timeslots_bp.route('', methods=['POST'])
@login_required
def add_timeslot():
    data = request.get_json()
    start = data['start']
    end = data['end']
    days = data.get('days', [])

    if start >= end:
        return json_response(message='End time must be after start', status=400)
    if not days:
        return json_response(message='Sélectionnez au moins un jour', status=400)

    existing = Timeslot.query.filter_by(user_id=current_user.id).all()
    for t in existing:
        shared_days = set(days) & set(t.days or [])
        if shared_days and not (end <= t.start or start >= t.end):
            shared_str = ', '.join(sorted(shared_days))
            return json_response(
                message=f'Chevauche un creneau existant ({t.start}-{t.end}) sur : {shared_str}',
                status=400
            )

    ts_id = f"ts_{int(time.time()*1000)}"
    ts = Timeslot(id=ts_id, user_id=current_user.id,
                  start=start, end=end, days=days)
    db.session.add(ts)
    db.session.commit()
    return json_response({'id': ts.id}, message='Timeslot added', status=201)


@timeslots_bp.route('/<timeslot_id>', methods=['DELETE'])
@login_required
def delete_timeslot(timeslot_id):
    ts = Timeslot.query.filter_by(
        id=timeslot_id, user_id=current_user.id).first_or_404()
    ScheduleEntry.query.filter_by(
        user_id=current_user.id, timeslot_id=timeslot_id).delete()
    db.session.delete(ts)
    db.session.commit()
    return json_response(message='Timeslot deleted')
