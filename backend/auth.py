from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Mail, Message
from models import db, User, PasswordResetToken
from utils import json_response
from werkzeug.security import generate_password_hash, check_password_hash
from limiter import limiter
import threading

PASSWORD_MIN_LENGTH = 6

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
mail = Mail()


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per minute")
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
        password=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    return json_response({'email': user.email, 'name': user.name}, message='Registered', status=201)


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
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


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return json_response(message='Email requis', status=400)

    user = User.query.filter_by(email=email).first()
    if not user:
        return json_response(message='un lien a été envoyé.')

    reset = PasswordResetToken.generate_for(user)
    db.session.add(reset)
    db.session.commit()

    frontend_url = current_app.config.get(
        'FRONTEND_ORIGIN', 'https://fechetahmakhlouf.github.io')
    reset_link = f"{frontend_url}?reset_token={reset.token}"

    try:
        msg = Message(
            subject='Réinitialisation de votre mot de passe — Jadwal',
            recipients=[user.email],
            html=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:2rem;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#1e293b;">Jadwal — Réinitialisation</h2>
              <p>Bonjour <strong>{user.name}</strong>,</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe.<br>
              Ce lien est valable <strong>1 heure</strong>.</p>
              <a href="{reset_link}"
                 style="display:inline-block;margin:1.2rem 0;padding:0.75rem 1.5rem;
                        background:#b8960c;color:#fff;border-radius:8px;
                        text-decoration:none;font-weight:600;">
                Réinitialiser mon mot de passe →
              </a>
              <p style="color:#6b7280;font-size:0.85rem;">
                Si vous n'avez pas fait cette demande, ignorez cet email.
              </p>
            </div>
            """
        )
        app_ctx = current_app._get_current_object()

        def send_async(app, message):
            with app.app_context():
                mail.send(message)
        t = threading.Thread(target=send_async, args=(app_ctx, msg))
        t.daemon = True
        t.start()
    except Exception as e:
        current_app.logger.error(f"Mail error: {e}")
        return json_response(message='Erreur envoi email. Vérifiez la configuration SMTP.', status=500)

    return json_response(message='Si cet email existe, un lien a été envoyé.')


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json()
    token = (data.get('token') or '').strip()
    new_password = data.get('password') or ''

    if not token or not new_password:
        return json_response(message='Token et mot de passe requis', status=400)
    if len(new_password) < 6:
        return json_response(message='Mot de passe trop court (min 6 caractères)', status=400)

    reset = PasswordResetToken.query.filter_by(token=token).first()
    if not reset or not reset.is_valid():
        return json_response(message='Lien invalide ou expiré', status=400)

    user = User.query.get(reset.user_id)
    user.password = generate_password_hash(new_password)
    reset.used = True
    db.session.commit()

    return json_response(message='Mot de passe mis à jour avec succès !')


@auth_bp.route('/change-password', methods=['PUT'])
@login_required
@limiter.limit("5 per minute")
def change_password():
    data = request.get_json() or {}
    current_password = data.get('currentPassword') or ''
    new_password = data.get('newPassword') or ''

    if not current_password or not new_password:
        return json_response(message='Mot de passe actuel et nouveau mot de passe requis', status=400)

    if not check_password_hash(current_user.password, current_password):
        return json_response(message='Mot de passe actuel incorrect', status=400)

    if len(new_password) < PASSWORD_MIN_LENGTH:
        return json_response(message='Nouveau mot de passe trop court (min 6 caractères)', status=400)

    current_user.password = generate_password_hash(new_password)
    db.session.commit()

    return json_response(message='Mot de passe modifié avec succès !')


@auth_bp.route('/account', methods=['DELETE'])
@login_required
@limiter.limit("5 per minute")
def delete_account():
    data = request.get_json() or {}
    password = data.get('password') or ''

    if not check_password_hash(current_user.password, password):
        return json_response(message='Mot de passe incorrect', status=403)

    user = User.query.get(current_user.id)

    # PasswordResetToken has no cascade relationship on User, so it must be
    # cleared explicitly or the DB's FK constraint will block the delete.
    PasswordResetToken.query.filter_by(user_id=user.id).delete()

    db.session.delete(user)
    db.session.commit()

    logout_user()
    return json_response(message='Compte supprimé avec succès')
