from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, ScheduleEntry, Subject
from utils import json_response

schedule_bp = Blueprint('schedule', __name__, url_prefix='/api/schedule')


@schedule_bp.route('', methods=['GET'])
@login_required
def get_schedule():
    week_offset = request.args.get('weekOffset', 0, type=int)
    entries = ScheduleEntry.query.filter_by(
        user_id=current_user.id, week_offset=week_offset).all()
    # return as dict keyed by "weekOffset_day_timeslotId" -> subjectId (like frontend)
    sched = {}
    for e in entries:
        key = f"{week_offset}_{e.day}_{e.timeslot_id}"
        sched[key] = e.subject_id
    return json_response(sched)


@schedule_bp.route('/assign', methods=['POST'])
@login_required
def assign():
    data = request.get_json()
    week_offset = data.get('weekOffset', 0)
    day = data['day']
    timeslot_id = data['timeslotId']
    subject_id = data['subjectId']

    subject = Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first()
    if not subject:
        return json_response(message='Subject not found', status=404)

    existing = ScheduleEntry.query.filter_by(
        user_id=current_user.id,
        week_offset=week_offset,
        day=day,
        timeslot_id=timeslot_id
    ).first()
    if existing:
        existing.subject_id = subject_id
    else:
        entry = ScheduleEntry(
            user_id=current_user.id,
            week_offset=week_offset,
            day=day,
            timeslot_id=timeslot_id,
            subject_id=subject_id
        )
        db.session.add(entry)
    db.session.commit()
    return json_response(message='Assigned')


@schedule_bp.route('/remove', methods=['POST'])
@login_required
def remove():
    data = request.get_json()
    week_offset = data.get('weekOffset', 0)
    day = data['day']
    timeslot_id = data['timeslotId']

    entry = ScheduleEntry.query.filter_by(
        user_id=current_user.id,
        week_offset=week_offset,
        day=day,
        timeslot_id=timeslot_id
    ).first()
    if entry:
        db.session.delete(entry)
        db.session.commit()
    return json_response(message='Removed')
