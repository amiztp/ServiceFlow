from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.service_management import (
    OfferingCreate,
    OfferingPatch,
    OfferingRead,
    ProviderDetail,
    ProviderSummary,
    ServiceCreate,
    ServicePatch,
    ServiceRead,
)
from app.services import service_management as services

router = APIRouter()
Database = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
PositiveId = Annotated[int, Path(gt=0)]


def require_admin(user: CurrentUser) -> None:
    if user.role != "SYSTEM_ADMIN":
        raise HTTPException(403, "System administrator access required")


Admin = Annotated[None, Depends(require_admin)]


@router.get("/services", response_model=list[ServiceRead], tags=["Marketplace"])
def public_catalog(db: Database):
    return services.list_catalog(db, active_only=True)


@router.get("/providers", response_model=list[ProviderSummary], tags=["Marketplace"])
def list_providers(
    db: Database,
    q: Annotated[str | None, Query(max_length=150)] = None,
    service_id: Annotated[int | None, Query(gt=0)] = None,
    area: Annotated[str | None, Query(max_length=150)] = None,
    provider_type: services.ProviderType | None = None,
    sort_by: services.ProviderSort = "rating",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return services.search_providers(
        db,
        q=q,
        service_id=service_id,
        area=area,
        provider_type=provider_type,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )


@router.get("/providers/{id}", response_model=ProviderDetail, tags=["Marketplace"])
def provider_profile(id: PositiveId, db: Database):
    return services.public_provider(db, id)


@router.get("/provider/me/services", response_model=list[OfferingRead], tags=["Provider services"])
def my_offerings(db: Database, user: CurrentUser):
    return services.list_offerings(db, user)


@router.post(
    "/provider/me/services", response_model=OfferingRead, status_code=201, tags=["Provider services"]
)
def add_offering(data: OfferingCreate, db: Database, user: CurrentUser):
    return services.create_offering(db, user, data)


@router.patch("/provider/me/services/{id}", response_model=OfferingRead, tags=["Provider services"])
def edit_offering(id: PositiveId, data: OfferingPatch, db: Database, user: CurrentUser):
    return services.update_offering(db, user, id, data)


@router.get("/admin/services", response_model=list[ServiceRead], tags=["Admin catalogue"])
def admin_catalog(db: Database, _admin: Admin):
    return services.list_catalog(db, active_only=False)


@router.post("/admin/services", response_model=ServiceRead, status_code=201, tags=["Admin catalogue"])
def add_service(data: ServiceCreate, db: Database, _admin: Admin):
    return services.create_catalog_entry(db, data)


@router.patch("/admin/services/{id}", response_model=ServiceRead, tags=["Admin catalogue"])
def edit_service(id: PositiveId, data: ServicePatch, db: Database, _admin: Admin):
    return services.update_catalog_entry(db, id, data)


@router.post("/admin/services/{id}/deactivate", response_model=ServiceRead, tags=["Admin catalogue"])
def deactivate_service(id: PositiveId, db: Database, _admin: Admin):
    return services.deactivate_catalog_entry(db, id)
