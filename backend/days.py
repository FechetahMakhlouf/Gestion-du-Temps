from flask import Blueprint, request
from flask_login import current_user, login_required
from models import db
from utils import json_response

days_bp = Blueprint('days', __name__, url_prefix='/api/days')


@days_bp.route('', methods=['GET'])
@login_required
def get_days():
    return json_response(current_user.active_days)


@days_bp.route('', methods=['PUT'])
@login_required
def update_days():
    data = request.get_json()
    if not isinstance(data, list):
        return json_response(message='Expected list of days', status=400)
    current_user.active_days = data
    db.session.commit()
    return json_response(message='Days updated')
