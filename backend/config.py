import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get(
        'SECRET_KEY') or 'dev-secret-key-change-in-production'

    db_url = os.environ.get('DATABASE_URL')

    if db_url and db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = db_url or 'sqlite:///' + \
        os.path.join(basedir, 'instance', 'jadwal.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,       # test connection before use
        'pool_recycle': 280,         # recycle connections every ~4.5 min
    }

    # Flask-Mail (Gmail SMTP)
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')   # votre email Gmail
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')   # App Password Gmail
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')

    FRONTEND_ORIGIN = os.environ.get(
        'FRONTEND_ORIGIN', 'https://fechetahmakhlouf.github.io')
