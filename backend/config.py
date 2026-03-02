import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get(
        'SECRET_KEY') or 'dev-secret-key-change-in-production'
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith('postgresql://jadwal_db_user:U9ligXHm4VutiwfUcrnDyW4B0pryUQ4F@dpg-d6ipoe95pdvs73bongsg-a/jadwal_db'):
        db_url = db_url.replace('postgresql://jadwal_db_user:U9ligXHm4VutiwfUcrnDyW4B0pryUQ4F@dpg-d6ipoe95pdvs73bongsg-a/jadwal_db',
                                'postgresql://jadwal_db_user:U9ligXHm4VutiwfUcrnDyW4B0pryUQ4F@dpg-d6ipoe95pdvs73bongsg-a/jadwal_db', 1)
    SQLALCHEMY_DATABASE_URI = db_url or 'sqlite:///' + \
        os.path.join(basedir, 'instance', 'jadwal.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
