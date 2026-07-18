from flask import Flask, send_from_directory
from flask_login import LoginManager
from flask_cors import CORS
from flask_mail import Mail
from flask_migrate import Migrate
from models import db, User
from config import Config
from auth import auth_bp, mail
from limiter import limiter
from subjects import subjects_bp
from timeslots import timeslots_bp
from days import days_bp
from schedule import schedule_bp
from autogen import autogen_bp
import os


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    frontend_origin = os.environ.get(
        'FRONTEND_ORIGIN', 'https://fechetahmakhlouf.github.io')
    CORS(app, supports_credentials=True, origins=[
        frontend_origin,
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ])

    app.config['SESSION_COOKIE_SECURE'] = os.environ.get(
        'ENV') == 'production'
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_HTTPONLY'] = True

    try:
        os.makedirs(os.path.join(app.instance_path), exist_ok=True)
    except OSError:
        pass

    db.init_app(app)
    migrate = Migrate(app, db)
    mail.init_app(app)
    limiter.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    app.register_blueprint(auth_bp)
    app.register_blueprint(subjects_bp)
    app.register_blueprint(timeslots_bp)
    app.register_blueprint(days_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(autogen_bp)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        frontend_dir = os.path.join(
            os.path.dirname(__file__), '..', 'frontend')
        if path and os.path.exists(os.path.join(frontend_dir, path)):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, 'index.html')

    @app.route('/api/ping', methods=['GET'])
    def ping():
        return {"status": "ok"}, 200

    @app.errorhandler(429)
    def rate_limit_handler(e):
        return {"message": "Trop de tentatives. Attendez une minute."}, 429

    return app


app = create_app()
if __name__ == '__main__':
    app.run(debug=True)
