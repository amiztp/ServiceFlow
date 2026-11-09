import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.models import User

VERIFICATION_TTL = timedelta(minutes=30)


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_verification_token(user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.verification_token_hash = hash_verification_token(token)
    user.verification_token_expires_at = datetime.now(timezone.utc) + VERIFICATION_TTL
    return token