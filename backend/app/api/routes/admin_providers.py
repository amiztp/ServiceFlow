from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_roles

from app.models import User

from app.schemas.admin_provider import (
    AdminProviderResponse,
    AdminProviderListResponse,
    ProviderActionResponse,
)

from app.services.admin_provider_service import (
    list_providers,
    get_provider,
    approve_provider,
    reject_provider,
    suspend_provider,
)


router = APIRouter(
    prefix="/admin/providers",
    tags=["Admin - Provider Management"],
)


admin_required = require_roles("SYSTEM_ADMIN")


@router.get(
    "",
    response_model=AdminProviderListResponse,
)
def admin_list_providers(
    verification_status: str | None = Query(default=None),
    provider_type: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    return list_providers(
        db=db,
        verification_status=verification_status,
        provider_type=provider_type,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{provider_id}",
    response_model=AdminProviderResponse,
)
def admin_get_provider(
    provider_id: int,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    return get_provider(db, provider_id)


@router.patch(
    "/{provider_id}/approve",
    response_model=ProviderActionResponse,
)
def admin_approve_provider(
    provider_id: int,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    provider = approve_provider(db, provider_id)

    return {
        "message": "Provider approved successfully",
        "provider": provider,
    }


@router.patch(
    "/{provider_id}/reject",
    response_model=ProviderActionResponse,
)
def admin_reject_provider(
    provider_id: int,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    provider = reject_provider(db, provider_id)

    return {
        "message": "Provider rejected successfully",
        "provider": provider,
    }


@router.patch(
    "/{provider_id}/suspend",
    response_model=ProviderActionResponse,
)
def admin_suspend_provider(
    provider_id: int,
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    provider = suspend_provider(db, provider_id)

    return {
        "message": "Provider suspended successfully",
        "provider": provider,
    }