from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db, Subject, ScheduleEntry, AutogenConfig
from utils import json_response
import time

subjects_bp = Blueprint('subjects', __name__, url_prefix='/api/subjects')


@subjects_bp.route('', methods=['GET'])
@login_required
def get_subjects():
    subjects = Subject.query.filter_by(user_id=current_user.id).all()
    return json_response([{
        'id': s.id, 'name': s.name, 'type': s.type, 'color': s.color
    } for s in subjects])


@subjects_bp.route('', methods=['POST'])
@login_required
def add_subject():
    data = request.get_json()
    subj_id = data.get('id', f"subj_{int(time.time()*1000)}")
    subject = Subject(
        id=subj_id,
        user_id=current_user.id,
        name=data['name'],
        type=data['type'],
        color=data['color']
    )
    db.session.add(subject)
    db.session.commit()
    return json_response({'id': subject.id}, message='Subject added', status=201)


@subjects_bp.route('/<subject_id>', methods=['PUT'])
@login_required
def update_subject(subject_id):
    subject = Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    data = request.get_json()
    subject.name = data['name']
    subject.type = data['type']
    subject.color = data['color']
    db.session.commit()
    return json_response(message='Subject updated')


@subjects_bp.route('/<subject_id>', methods=['DELETE'])
@login_required
def delete_subject(subject_id):
    subject = Subject.query.filter_by(
        id=subject_id, user_id=current_user.id).first_or_404()
    ScheduleEntry.query.filter_by(
        user_id=current_user.id, subject_id=subject_id).delete()
    AutogenConfig.query.filter_by(
        user_id=current_user.id, subject_id=subject_id).delete()
    db.session.delete(subject)
    db.session.commit()
    return json_response(message='Subject deleted')
