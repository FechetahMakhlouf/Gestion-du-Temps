"""
productivity_routes.py — /api/productivity/<week_offset> endpoint
"""

from flask import Blueprint
from flask_login import current_user, login_required
from utils import json_response
from productivity import calculate_productivity

productivity_bp = Blueprint('productivity', __name__, url_prefix='/api/productivity')


@productivity_bp.route('/<int:week_offset>', methods=['GET'])
@login_required
def get_productivity(week_offset: int):
    """
    GET /api/productivity/<week_offset>

    Returns the productivity score for the authenticated user's week.
    week_offset == 0  → current week
    week_offset == -1 → last week, etc.
    """
    result = calculate_productivity(current_user.id, week_offset)
    return json_response(result)
