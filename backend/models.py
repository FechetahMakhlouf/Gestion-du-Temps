from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    password = db.Column(db.String(200), nullable=False)
    active_days = db.Column(
        db.JSON, default=['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'])

    subjects = db.relationship(
        'Subject', backref='user', lazy=True, cascade='all, delete-orphan')
    timeslots = db.relationship(
        'Timeslot', backref='user', lazy=True, cascade='all, delete-orphan')
    schedule_entries = db.relationship(
        'ScheduleEntry', backref='user', lazy=True, cascade='all, delete-orphan')
    autogen_configs = db.relationship(
        'AutogenConfig', backref='user', lazy=True, cascade='all, delete-orphan')


class Subject(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), nullable=False)


class Timeslot(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start = db.Column(db.String(5), nullable=False)
    end = db.Column(db.String(5), nullable=False)


class ScheduleEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    week_offset = db.Column(db.Integer, nullable=False, default=0)
    day = db.Column(db.String(3), nullable=False)
    timeslot_id = db.Column(db.String(50), db.ForeignKey(
        'timeslot.id'), nullable=False)
    subject_id = db.Column(db.String(50), db.ForeignKey(
        'subject.id'), nullable=False)

    __table_args__ = (db.UniqueConstraint(
        'user_id', 'week_offset', 'day', 'timeslot_id', name='unique_cell'),)


class AutogenConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.String(50), db.ForeignKey(
        'subject.id'), nullable=False)
    hours = db.Column(db.Float, nullable=False, default=0.0)

    __table_args__ = (db.UniqueConstraint(
        'user_id', 'subject_id', name='unique_user_subject'),)
