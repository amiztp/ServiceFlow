from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Provider, User


VALID_STATUSES = {
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
}


def list_providers(
    db: Session,
    verification_status: str | None = None,
    provider_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
):
    query = select(Provider)

    if verification_status:
        verification_status = verification_status.upper()

        if verification_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail="Invalid verification status",
            )

        query = query.where(
            Provider.verification_status == verification_status
        )

    if provider_type:
        provider_type = provider_type.upper()

        if provider_type not in {"INDIVIDUAL", "COMPANY"}:
            raise HTTPException(
                status_code=422,
                detail="Invalid provider type",
            )

        query = query.where(Provider.type == provider_type)

    total_query = select(func.count()).select_from(query.subquery())

    total = db.scalar(total_query) or 0

    providers = db.scalars(
        query
        .order_by(Provider.created_at.desc(), Provider.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": providers,
    }


def get_provider(db: Session, provider_id: int):
    provider = db.get(Provider, provider_id)

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="Provider not found",
        )

    return provider


def approve_provider(db: Session, provider_id: int):
    provider = db.scalar(
        select(Provider)
        .where(Provider.id == provider_id)
        .with_for_update()
    )

    if provider is None:
        raise HTTPException(404, "Provider not found")

    if provider.verification_status == "APPROVED":
        raise HTTPException(
            409,
            "Provider is already approved",
        )

    if provider.verification_status == "SUSPENDED":
        raise HTTPException(
            409,
            "A suspended provider cannot be approved directly",
        )

    users = db.scalars(
        select(User)
        .where(
            User.provider_id == provider.id,
            User.role.in_([
                "COMPANY_MANAGER",
                "INDIVIDUAL_PROVIDER",
            ]),
        )
        .with_for_update()
    ).all()

    if not users:
        raise HTTPException(
            409,
            "Provider has no linked owner account",
        )

    provider.verification_status = "APPROVED"

    for user in users:
        user.status = (
            "ACTIVE"
            if user.email_verified_at is not None
            else "PENDING"
        )

    try:
        db.commit()
        db.refresh(provider)
    except Exception:
        db.rollback()
        raise

    return provider


def reject_provider(db: Session, provider_id: int):
    provider = db.scalar(
        select(Provider)
        .where(Provider.id == provider_id)
        .with_for_update()
    )

    if provider is None:
        raise HTTPException(404, "Provider not found")

    if provider.verification_status == "REJECTED":
        raise HTTPException(
            409,
            "Provider is already rejected",
        )

    if provider.verification_status == "SUSPENDED":
        raise HTTPException(
            409,
            "A suspended provider cannot be rejected directly",
        )

    provider.verification_status = "REJECTED"

    try:
        db.commit()
        db.refresh(provider)
    except Exception:
        db.rollback()
        raise

    return provider


def suspend_provider(db: Session, provider_id: int):
    provider = db.scalar(
        select(Provider)
        .where(Provider.id == provider_id)
        .with_for_update()
    )

    if provider is None:
        raise HTTPException(404, "Provider not found")

    if provider.verification_status == "SUSPENDED":
        raise HTTPException(
            409,
            "Provider is already suspended",
        )

    if provider.verification_status != "APPROVED":
        raise HTTPException(
            409,
            "Only approved providers can be suspended",
        )

    provider.verification_status = "SUSPENDED"

    try:
        db.commit()
        db.refresh(provider)
    except Exception:
        db.rollback()
        raise

    return provider