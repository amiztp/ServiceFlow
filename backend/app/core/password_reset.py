import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.models import User

RESET_TOKEN_TTL = timedelta(minutes=30)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_reset_token(user: User) -> str:
    token = secrets.token_urlsafe(32)

    user.reset_token_hash = hash_reset_token(token)
    user.reset_token_expires_at = (
        datetime.now(timezone.utc) + RESET_TOKEN_TTL
    )

    return token