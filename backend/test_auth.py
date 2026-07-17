"""
test_auth.py — Password hashing security tests
Run from the backend directory:  python -m pytest test_auth.py -v
Requires: pytest, a valid DATABASE_URL in env (or .env), and the app running locally.

These tests call the live Flask app via its HTTP routes, so they need
the server to be up (or use the test client below — both patterns shown).
"""

import os
import sys
import pytest

# ── In-process test client (no server needed) ───────────────────────────────
# Adjust the import path if your project structure differs.
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app  # noqa: E402  (import after sys.path patch)
from models import db, User  # noqa: E402


@pytest.fixture(scope="module")
def app():
    """Create a throwaway in-memory SQLite app for testing."""
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret-key-not-for-production",
        "WTF_CSRF_ENABLED": False,
        "MAIL_SUPPRESS_SEND": True,
    }
    application = create_app(test_config)
    with application.app_context():
        db.create_all()
        yield application
        db.drop_all()


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


# ── Helpers ──────────────────────────────────────────────────────────────────

def register(client, email, password, name="Test User"):
    return client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
        content_type="application/json",
    )


def login(client, email, password):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
        content_type="application/json",
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestPasswordHashing:
    """Verify that passwords are stored as bcrypt hashes, never as Base64."""

    def test_register_stores_bcrypt_not_base64(self, client, app):
        """
        After registration the password column must NOT start with 'eyJ' (Base64
        prefix for JSON/bytes) and must start with '$2b$' (bcrypt identifier).
        """
        email = "hash_check@example.com"
        resp = register(client, email, "securePass1")
        assert resp.status_code == 201, f"Register failed: {resp.get_json()}"

        with app.app_context():
            user = User.query.filter_by(email=email).first()
            assert user is not None, "User not found in DB after register"

            stored = user.password

            # Must NOT be Base64
            assert not stored.startswith("eyJ"), (
                f"Password is stored as Base64! Value starts with: {stored[:10]}"
            )

            # Must be bcrypt (werkzeug uses pbkdf2 or scrypt by default;
            # if you switch to bcrypt explicitly the prefix is $2b$)
            # werkzeug's generate_password_hash defaults to pbkdf2:sha256
            valid_prefixes = ("pbkdf2:", "scrypt:", "$2b$", "$2a$")
            assert any(stored.startswith(p) for p in valid_prefixes), (
                f"Password hash format unrecognised — stored value starts with: {stored[:20]}"
            )

    def test_login_correct_password_succeeds(self, client):
        """A registered user can log in with the correct password."""
        email = "login_ok@example.com"
        password = "myGoodPassword99"

        reg = register(client, email, password)
        assert reg.status_code == 201

        resp = login(client, email, password)
        assert resp.status_code == 200, f"Login failed unexpectedly: {resp.get_json()}"

    def test_login_wrong_password_returns_401(self, client):
        """Logging in with the wrong password must return HTTP 401."""
        email = "login_bad@example.com"

        reg = register(client, email, "correctPassword")
        assert reg.status_code == 201

        resp = login(client, email, "wrongPassword")
        assert resp.status_code == 401, (
            f"Expected 401 for wrong password, got {resp.status_code}: {resp.get_json()}"
        )

    def test_login_nonexistent_user_returns_401(self, client):
        """Logging in with an email that was never registered must return 401."""
        resp = login(client, "nobody@example.com", "anything")
        assert resp.status_code == 401

    def test_password_minimum_length_enforced(self, client):
        """Passwords shorter than 6 characters must be rejected at registration."""
        resp = register(client, "short@example.com", "abc")
        assert resp.status_code == 400

    def test_duplicate_email_rejected(self, client):
        """Registering twice with the same email must return 400."""
        email = "dupe@example.com"
        register(client, email, "password123")
        resp = register(client, email, "differentPassword")
        assert resp.status_code == 400
