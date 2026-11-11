
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.models.provider_area import ProviderArea
from app.models.user import User
from app.schemas.service_area import ServiceAreaCreate


def get_provider_id(db: Session, user: User) -> int:
    allowed_types = {
        "COMPANY_MANAGER": "COMPANY",
        "INDIVIDUAL_PROVIDER": "INDIVIDUAL",
    }

    expected_type = allowed_types.get(user.role)

    if expected_type is None or user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Provider management access required",
        )

    provider = db.scalar(
        select(Provider).where(
            Provider.id == user.provider_id,
            Provider.type == expected_type,
            Provider.verification_status == "APPROVED",
        )
    )

    if provider is None:
        raise HTTPException(
            status_code=403,
            detail="An approved provider is required",
        )

    return provider.id


def list_service_areas(
    db: Session,
    provider_id: int,
):
    return db.scalars(
        select(ProviderArea)
        .where(ProviderArea.provider_id == provider_id)
        .order_by(
            func.lower(ProviderArea.area_name),
            ProviderArea.id,
        )
    ).all()


def create_service_area(
    db: Session,
    provider_id: int,
    data: ServiceAreaCreate,
):
    area_name = data.area_name

    existing = db.scalar(
        select(ProviderArea.id).where(
            ProviderArea.provider_id == provider_id,
            func.lower(ProviderArea.area_name) == area_name.lower(),
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="This service area already exists",
        )

    area = ProviderArea(
        provider_id=provider_id,
        area_name=area_name,
    )

    db.add(area)

    try:
        db.commit()
        db.refresh(area)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This service area already exists",
        ) from exc

    return area


def delete_service_area(
    db: Session,
    provider_id: int,
    area_id: int,
):
    area = db.scalar(
        select(ProviderArea).where(
            ProviderArea.id == area_id,
            ProviderArea.provider_id == provider_id,
        )
    )

    if area is None:
        raise HTTPException(
            status_code=404,
            detail="Service area not found",
        )

    try:
        db.delete(area)
        db.commit()

    except Exception:
        db.rollback()
        raise
