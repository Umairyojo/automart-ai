"""Shared Flask extensions (db, login_manager)."""
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
login_manager = LoginManager()
# JSON API uses unauthorized_handler instead of redirecting to a login page.
login_manager.login_view = None
