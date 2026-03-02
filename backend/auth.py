from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
import base64

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return json_response(message='Missing fields', status=400)
    if len(password) < 6:
        return json_response(message='Password too short', status=400)

    if User.query.filter_by(email=email).first():
        return json_response(message='Email already used', status=400)

    user = User(
        email=email,
        name=name,
        password=base64.b64encode(password.encode()).decode()
    )
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return json_response({'email': user.email, 'name': user.name}, message='Registered', status=201)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or user.password != base64.b64encode(password.encode()).decode():
        return json_response(message='Invalid credentials', status=401)

    login_user(user)
    return json_response({'email': user.email, 'name': user.name}, message='Logged in')


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return json_response(message='Logged out')


@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return json_response({'email': current_user.email, 'name': current_user.name})
