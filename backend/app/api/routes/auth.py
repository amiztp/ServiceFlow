
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.core.security import hash_password
from app.schemas.auth import RegisterRequest, RegisterResponse
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.dependencies import get_current_user
from app.core.permissions import require_roles

router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_client(
    data: RegisterRequest,
    db: Session = Depends(get_db),
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
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to register with this email. It may already be in use.",
        )

    return user

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