from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.core.security import hash_password
from app.schemas.auth import ChangePasswordRequest, RegisterRequest, RegisterResponse
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.dependencies import get_current_user
from app.core.permissions import require_roles
from fastapi import BackgroundTasks
from app.core.email import send_verification_email
from app.core.email_verification import issue_verification_token
from datetime import datetime, timezone

from app.core.email_verification import hash_verification_token
from app.schemas.auth import VerifyEmailRequest
from app.models import Provider
from app.schemas.auth import (
    ProviderRegisterRequest,
    ProviderRegisterResponse,
)


from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks

from app.core.email import send_password_reset_email
from app.core.password_reset import issue_reset_token
from app.schemas.auth import ForgotPasswordRequest

from datetime import datetime, timezone

from app.core.password_reset import hash_reset_token
from app.core.security import hash_password
from app.schemas.auth import ResetPasswordRequest


from app.core.email_verification import (
    VERIFICATION_TTL,
    hash_verification_token,
    issue_verification_token,
)
from app.schemas.auth import ResendVerificationRequest

router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_client(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    email = str(data.email).lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=data.name.strip(),
        email=email,
        phone=data.phone.strip(),
        password_hash=hash_password(data.password),
        role="CLIENT",
        provider_id=None,
        status="PENDING",
    )

    try:
        token = issue_verification_token(user)
        recipient = user.email

        db.add(user)
        db.commit()

        background_tasks.add_task(send_verification_email, recipient, token)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to register with this email. It may already be in use.",
        )

    return user


def register_provider_account(
    data: ProviderRegisterRequest,
    provider_type: str,
    user_role: str,
    db: Session,
    background_tasks: BackgroundTasks,
):
    user_email = str(data.email).lower()
    provider_email = str(data.provider_email).lower()

    existing_user = db.scalar(
        select(User).where(User.email == user_email)
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="User email already registered",
        )

    provider = Provider(
        type=provider_type,
        name=data.provider_name.strip(),
        email=provider_email,
        phone=data.provider_phone.strip(),
        address=data.address,
        description=data.description,
        verification_status="PENDING",
        accepting_requests=False,
    )

    try:
        db.add(provider)
        db.flush()

        user = User(
            provider_id=provider.id,
            role=user_role,
            name=data.name.strip(),
            email=user_email,
            phone=data.phone.strip(),
            password_hash=hash_password(data.password),
            status="PENDING",
        )

        token = issue_verification_token(user)
        recipient = user.email

        db.add(user)
        db.commit()

        background_tasks.add_task(send_verification_email, recipient, token)
        db.refresh(user)
        db.refresh(provider)

        return ProviderRegisterResponse(
            user_id=user.id,
            provider_id=provider.id,
            name=user.name,
            email=user.email,
            role=user.role,
            user_status=user.status,
            provider_status=provider.verification_status,
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Registration failed because an account or provider record conflicts with existing data.",
        )
    except Exception:
        db.rollback()
        raise

@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user or not verify_password(
        data.password, user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="Your account is not active",
        )

    token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    return TokenResponse(access_token=token)

@router.get("/me", response_model=RegisterResponse)
def get_my_account(
    current_user: User = Depends(get_current_user),
):
    return current_user
@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(require_roles("SYSTEM_ADMIN")),
):
    return {"message": "Admin access granted"}


@router.post(
    "/register/company",
    response_model=ProviderRegisterResponse,
    status_code=201,
)
def register_company(
    data: ProviderRegisterRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    return register_provider_account(
        data=data,
        provider_type="COMPANY",
        user_role="COMPANY_MANAGER",
        db=db,
        background_tasks=background_tasks,
    )


@router.post(
    "/register/provider",
    response_model=ProviderRegisterResponse,
    status_code=201,
)
def register_individual_provider(
    data: ProviderRegisterRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    return register_provider_account(
        data=data,
        provider_type="INDIVIDUAL",
        user_role="INDIVIDUAL_PROVIDER",
        db=db,
        background_tasks=background_tasks,
    )

@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    token_hash = hash_verification_token(data.token)

    user = db.scalar(
        select(User)
        .where(User.verification_token_hash == token_hash)
        .with_for_update()
    )

    now = datetime.now(timezone.utc)
    if (
        user is None
        or user.email_verified_at is not None
        or user.verification_token_expires_at is None
        or user.verification_token_expires_at <= now
        or user.status not in {"PENDING", "ACTIVE"}
    ):
        raise HTTPException(400, "Invalid or expired verification link")

    user.email_verified_at = now
    user.verification_token_hash = None
    user.verification_token_expires_at = None

    if user.role == "CLIENT" and user.status == "PENDING":
        user.status = "ACTIVE"

    db.commit()
    return {"message": "Email verified", "user_status": user.status}

VERIFICATION_RESEND_COOLDOWN = timedelta(minutes=1)


@router.post("/resend-verification", status_code=202)
def resend_verification(
    data: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    response = {
        "message": (
            "If the account is eligible, a verification email will be sent."
        )
    }

    email = str(data.email).lower()
    user = db.scalar(
        select(User)
        .where(User.email == email)
        .with_for_update()
    )

    if (
        user is None
        or user.email_verified_at is not None
        or user.status != "PENDING"
    ):
        return response

    expires_at = user.verification_token_expires_at
    if expires_at is not None:
        issued_at = expires_at - VERIFICATION_TTL
        if datetime.now(timezone.utc) < issued_at + VERIFICATION_RESEND_COOLDOWN:
            return response

    token = issue_verification_token(user)
    recipient = user.email
    db.commit()

    background_tasks.add_task(send_verification_email, recipient, token)
    return response



@router.post("/forgot-password", status_code=202)
def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    response = {
        "message": "If the account exists, a password reset email will be sent."
    }

    email = str(data.email).lower()

    user = db.scalar(
        select(User)
        .where(User.email == email)
        .with_for_update()
    )

    if user is None or user.status not in {"ACTIVE", "PENDING"}:
        return response

    token = issue_reset_token(user)
    recipient = user.email

    db.commit()

    background_tasks.add_task(
        send_password_reset_email,
        recipient,
        token,
    )

    return response



@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_hash = hash_reset_token(data.token)

    user = db.scalar(
        select(User)
        .where(User.reset_token_hash == token_hash)
        .with_for_update()
    )

    now = datetime.now(timezone.utc)

    if (
        user is None
        or user.reset_token_expires_at is None
        or user.reset_token_expires_at <= now
        or user.status not in {"ACTIVE", "PENDING"}
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset link",
        )

    user.password_hash = hash_password(data.new_password)
    user.must_change_password = False

    # Invalidate the reset token.
    user.reset_token_hash = None
    user.reset_token_expires_at = None

    db.commit()

    return {
        "message": "Password has been reset successfully."
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User)
        .where(User.id == current_user.id, User.status == "ACTIVE")
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    if user is None:
        raise HTTPException(status_code=403, detail="Account is not active")

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="New password must differ from the current password",
        )

    user.password_hash = hash_password(data.new_password)
    user.must_change_password = False
    user.reset_token_hash = None
    user.reset_token_expires_at = None

    db.commit()
    return {"message": "Password changed successfully"}