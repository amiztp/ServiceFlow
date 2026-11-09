import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(recipient: str, token: str) -> None:
    fragment = urlencode({"token": token})
    link = f"{settings.FRONTEND_VERIFY_EMAIL_URL}#{fragment}"

    message = EmailMessage()
    message["Subject"] = "Verify your ServiceFlow email"
    message["From"] = settings.GMAIL_SMTP_USER
    message["To"] = recipient
    message.set_content(
        f"Verify your ServiceFlow email by opening this link:\n\n{link}\n\n"
        "This link expires in 30 minutes. "
        "If you didn't create this account, you can ignore this email."
    )

    try:
        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=10,
            context=ssl.create_default_context(),
        ) as smtp:
            smtp.login(
                settings.GMAIL_SMTP_USER,
                settings.GMAIL_SMTP_APP_PASSWORD.get_secret_value(),
            )
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.error("Verification email delivery failed (%s)", type(exc).__name__)


def send_password_reset_email(recipient: str, token: str) -> None:
    link = (
        f"{settings.FRONTEND_RESET_PASSWORD_URL}"
        f"#token={token}"
    )

    message = EmailMessage()
    message["Subject"] = "Reset your ServiceFlow password"
    message["From"] = settings.GMAIL_SMTP_USER
    message["To"] = recipient

    message.set_content(
        f"Hello,\n\n"
        f"Use the following link to reset your password:\n\n"
        f"{link}\n\n"
        f"This link expires in 30 minutes.\n\n"
        f"If you did not request a password reset, ignore this email."
    )

    try:
        with smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            timeout=10,
            context=ssl.create_default_context(),
        ) as smtp:
            smtp.login(
                settings.GMAIL_SMTP_USER,
                settings.GMAIL_SMTP_APP_PASSWORD.get_secret_value(),
            )
            smtp.send_message(message)

    except (OSError, smtplib.SMTPException) as exc:
        logger.error(
            "Password reset email delivery failed (%s)",
            type(exc).__name__,
        )