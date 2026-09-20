"""Identity service: Argon2id, opaque sessions, lockout, reset (docs/06, 05 §5.1)."""

import hashlib
import secrets
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy.orm import Session as DbSession

from app.domain.auth import PasswordResetToken, Session, User

SESSION_TTL = timedelta(days=14)
SESSION_ABSOLUTE_CAP = timedelta(days=30)
RESET_TTL = timedelta(minutes=30)
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW = timedelta(minutes=15)

_ph = PasswordHasher()  # Argon2id defaults

# In-memory failure tracking (Redis-backed at Stage 6+; single-process dev only).
_failures: dict[tuple[str, str], list[datetime]] = {}

COMMON_PASSWORDS = frozenset(
    "password password1 password123 1234567890 qwerty12345 letmein123 iloveyou12 admin12345".split()
)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def _sha256(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def check_password_rules(password: str) -> str | None:
    if len(password) < 10:
        return "password must be at least 10 characters"
    if password.lower() in COMMON_PASSWORDS:
        return "password is too common"
    return None


# -- lockout ---------------------------------------------------------------
def _prune(now: datetime) -> None:
    cutoff = now - LOCKOUT_WINDOW
    for key in list(_failures):
        _failures[key] = [t for t in _failures[key] if t > cutoff]
        if not _failures[key]:
            del _failures[key]


def is_locked(email: str, ip: str, now: datetime | None = None) -> bool:
    now = now or datetime.utcnow()
    _prune(now)
    return len(_failures.get((email.lower(), ip), [])) >= LOCKOUT_THRESHOLD


def record_failure(email: str, ip: str, now: datetime | None = None) -> None:
    now = now or datetime.utcnow()
    _prune(now)
    _failures.setdefault((email.lower(), ip), []).append(now)


def clear_failures(email: str, ip: str) -> None:
    _failures.pop((email.lower(), ip), None)


def reset_lockouts() -> None:  # test hook
    _failures.clear()


# -- users -----------------------------------------------------------------
def get_user_by_email(db: DbSession, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower(), User.deleted_at.is_(None)).first()


def create_user(db: DbSession, *, email: str, password: str, display_name: str) -> User:
    first = db.query(User).count() == 0
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        display_name=display_name,
        role_code="admin" if first else "consumer",  # bootstrap: first account administers
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# -- sessions --------------------------------------------------------------
def create_session(db: DbSession, user: User) -> tuple[str, str]:
    """Returns (session_token, csrf_token). Rotates: fresh row per login."""
    now = datetime.utcnow()
    session_token, csrf_token = _token(), _token(24)
    db.add(
        Session(
            user_id=user.id,
            token_hash=_sha256(session_token),
            csrf_token_hash=_sha256(csrf_token),
            expires_at=now + SESSION_TTL,
            last_seen_at=now,
        )
    )
    db.commit()
    return session_token, csrf_token


def get_session_user(db: DbSession, session_token: str) -> tuple[Session | None, User | None]:
    row = db.query(Session).filter(Session.token_hash == _sha256(session_token)).first()
    if row is None or row.revoked_at is not None:
        return None, None
    now = datetime.utcnow()
    if row.expires_at < now or row.created_at + SESSION_ABSOLUTE_CAP < now:
        return None, None
    user = db.query(User).filter(User.id == row.user_id, User.deleted_at.is_(None)).first()
    if user is None:
        return None, None
    # sliding refresh
    row.last_seen_at = now
    row.expires_at = now + SESSION_TTL
    db.commit()
    return row, user


def revoke_session(db: DbSession, row: Session) -> None:
    row.revoked_at = datetime.utcnow()
    db.commit()


def revoke_user_sessions(db: DbSession, user_id: str, except_id: str = "") -> None:
    now = datetime.utcnow()
    for row in db.query(Session).filter(Session.user_id == user_id, Session.revoked_at.is_(None)):
        if row.id != except_id:
            row.revoked_at = now
    db.commit()


def csrf_valid(row: Session, csrf_token: str) -> bool:
    return secrets.compare_digest(row.csrf_token_hash, _sha256(csrf_token))


# -- password reset (MailAdapter = NoOp in dev; always 202 upstream) --------
def request_reset(db: DbSession, email: str) -> None:
    user = get_user_by_email(db, email)
    if user is None:
        return  # no existence disclosure; caller still returns 202
    token = _token()
    db.add(
        PasswordResetToken(
            user_id=user.id, token_hash=_sha256(token), expires_at=datetime.utcnow() + RESET_TTL
        )
    )
    db.commit()
    # TODO Stage 12: deliver via MailAdapter. Dev: token stays server-side; tests read the row.


def confirm_reset(db: DbSession, token: str, new_password: str) -> bool:
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _sha256(token))
        .first()
    )
    if row is None or row.used_at is not None or row.expires_at < datetime.utcnow():
        return False
    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None:
        return False
    user.password_hash = hash_password(new_password)
    row.used_at = datetime.utcnow()
    db.commit()
    revoke_user_sessions(db, user.id)
    return True
