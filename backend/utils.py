from functools import wraps
from flask import jsonify, session
from flask_login import current_user


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


def json_response(data=None, message=None, status=200):
    res = {}
    if data is not None:
        res['data'] = data
    if message:
        res['message'] = message
    return jsonify(res), status
