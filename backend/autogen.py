from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, AutogenConfig, Subject, Timeslot, ScheduleEntry
from utils import json_response

autogen_bp = Blueprint('autogen', __name__, url_prefix='/api/autogen')


@autogen_bp.route('', methods=['GET'])
@login_required
def get_config():
    configs = AutogenConfig.query.filter_by(user_id=current_user.id).all()
    result = {c.subject_id: c.hours for c in configs}
    return json_response(result)


@autogen_bp.route('', methods=['PUT'])
@login_required
def update_config():
    data = request.get_json()
    if not isinstance(data, dict):
        return json_response(message='Expected dict', status=400)

    AutogenConfig.query.filter_by(user_id=current_user.id).delete()
    for subj_id, hours in data.items():
        subject = Subject.query.filter_by(
            id=subj_id, user_id=current_user.id).first()
        if subject and hours > 0:
            config = AutogenConfig(
                user_id=current_user.id,
                subject_id=subj_id,
                hours=hours
            )
            db.session.add(config)
    db.session.commit()
    return json_response(message='Autogen config updated')


@autogen_bp.route('/generate', methods=['POST'])
@login_required
def generate():
    week_offset = request.args.get('weekOffset', 0, type=int)
    subjects = Subject.query.filter_by(user_id=current_user.id).all()
    timeslots = Timeslot.query.filter_by(
        user_id=current_user.id).order_by(Timeslot.start).all()
    configs = {c.subject_id: c.hours for c in AutogenConfig.query.filter_by(
        user_id=current_user.id).all()}

    if not subjects or not timeslots:
        return json_response(message='Missing subjects or timeslots', status=400)

    cells = []
    for ts in timeslots:
        ts_days = ts.days or []
        for day in ts_days:
            cells.append({'day': day, 'timeslot_id': ts.id})

    if not cells:
        return json_response(message='Aucun créneau avec des jours configurés', status=400)

    occupied_keys = set()
    existing = ScheduleEntry.query.filter_by(
        user_id=current_user.id, week_offset=week_offset).all()
    for e in existing:
        occupied_keys.add((e.day, e.timeslot_id))

    available_cells = [c for c in cells if (
        c['day'], c['timeslot_id']) not in occupied_keys]

    assignments = []
    for subj in subjects:
        hours_needed = configs.get(subj.id, 0)
        if hours_needed <= 0:
            continue
        for cell in available_cells[:]:
            ts = next(t for t in timeslots if t.id == cell['timeslot_id'])
            start_h, start_m = map(int, ts.start.split(':'))
            end_h, end_m = map(int, ts.end.split(':'))
            duration = (end_h * 60 + end_m - start_h * 60 - start_m) / 60
            if duration <= 0:
                continue
            if hours_needed > 0:
                assignments.append({
                    'week_offset': week_offset,
                    'day': cell['day'],
                    'timeslot_id': ts.id,
                    'subject_id': subj.id
                })
                available_cells.remove(cell)
                hours_needed -= duration
            if hours_needed <= 0:
                break

    for a in assignments:
        entry = ScheduleEntry(
            user_id=current_user.id,
            week_offset=a['week_offset'],
            day=a['day'],
            timeslot_id=a['timeslot_id'],
            subject_id=a['subject_id']
        )
        db.session.add(entry)
    db.session.commit()

    return json_response({'assigned': len(assignments)}, message='Generation complete')
