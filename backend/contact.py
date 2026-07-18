from flask import Blueprint, request, current_app
from flask_mail import Message
from auth import mail
from utils import json_response
from limiter import limiter
import threading

contact_bp = Blueprint('contact', __name__, url_prefix='/api/contact')


@contact_bp.route('', methods=['POST'])
@limiter.limit("3 per hour")
def send_contact():
    data = request.get_json()
    name = (data.get('name') or '').strip()[:100]
    email = (data.get('email') or '').strip()[:120]
    message = (data.get('message') or '').strip()[:2000]

    if not name or not email or not message:
        return json_response(message='Tous les champs sont requis', status=400)

    admin_email = current_app.config.get('MAIL_USERNAME')
    if not admin_email:
        current_app.logger.error(
            "Contact form: MAIL_USERNAME is not configured")
        return json_response(message='Erreur envoi email. Vérifiez la configuration SMTP.', status=500)

    try:
        msg = Message(
            subject=f'[Jadwal Contact] Message de {name}',
            recipients=[admin_email],
            reply_to=email,
            html=f'<p><strong>De :</strong> {name} ({email})</p><p>{message.replace(chr(10), "<br>")}</p>'
        )

        app_ctx = current_app._get_current_object()

        def send_async(app, m):
            with app.app_context():
                mail.send(m)

        t = threading.Thread(target=send_async, args=(app_ctx, msg))
        t.daemon = True
        t.start()
    except Exception as e:
        current_app.logger.error(f"Contact mail error: {e}")
        return json_response(message='Erreur envoi email. Vérifiez la configuration SMTP.', status=500)

    return json_response(message='Message envoyé avec succès !')
