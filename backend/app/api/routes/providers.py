from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.provider import Provider
from app.schemas.provider import (
    ProviderProfileResponse,
    ProviderProfileUpdate,
)

from app.schemas.working_hour import (
    WorkingHoursUpdate,
    WorkingHoursResponse,
)

from app.services.working_hour_service import (
    get_working_hours,
    replace_working_hours,
)


router = APIRouter(prefix="/providers", tags=["Providers"])


def require_provider_manager(current_user: User):
    if current_user.role not in {
        "COMPANY_MANAGER",
        "INDIVIDUAL_PROVIDER",
    }:
        raise HTTPException(
            status_code=403,
            detail="Provider access required",
        )

    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )


@router.get(
    "/me",
    response_model=ProviderProfileResponse,
)
def get_my_provider_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )

    provider = db.get(Provider, current_user.provider_id)

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="Provider profile not found",
        )

    return provider


@router.patch(
    "/me",
    response_model=ProviderProfileResponse,
)
def update_my_provider_profile(
    data: ProviderProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "COMPANY_MANAGER",
        "INDIVIDUAL_PROVIDER",
    }:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to update this provider profile",
        )

    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )

    provider = db.get(Provider, current_user.provider_id)

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="Provider profile not found",
        )

    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No profile fields were provided",
        )

    for field, value in updates.items():
        setattr(provider, field, value)

    try:
        db.commit()
        db.refresh(provider)
    except Exception:
        db.rollback()
        raise

    return provider


@router.get(
    "/me/working-hours",
    response_model=WorkingHoursResponse,
)
def read_my_working_hours(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_provider_manager(current_user)

    hours = get_working_hours(
        db,
        current_user.provider_id,
    )

    return {"working_hours": hours}

@router.put(
    "/me/working-hours",
    response_model=WorkingHoursResponse,
)
def update_my_working_hours(
    data: WorkingHoursUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_provider_manager(current_user)

    hours = replace_working_hours(
        db,
        current_user.provider_id,
        data,
    )

    return {"working_hours": hours}