from typing import Literal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.policy import Policy
from app.models.provider import Provider
from app.models.provider_area import ProviderArea
from app.models.provider_service import ProviderService
from app.models.service import Service
from app.models.user import User
from app.schemas.service_management import (
    OfferingCreate,
    OfferingPatch,
    OfferingRead,
    ProviderDetail,
    ProviderSummary,
    PublicOffering,
    PublicPolicy,
    ServiceCreate,
    ServicePatch,
    ServiceRead,
)

ProviderType = Literal["INDIVIDUAL", "COMPANY"]
ProviderSort = Literal["rating", "starting_price", "completed_jobs"]


def list_catalog(db: Session, *, active_only: bool):
    query = select(Service).order_by(Service.name, Service.id)
    if active_only:
        query = query.where(Service.is_active.is_(True))
    return db.scalars(query).all()


def _catalog_entry(db: Session, service_id: int, *, lock: bool = False) -> Service:
    query = select(Service).where(Service.id == service_id)
    if lock:
        query = query.with_for_update()
    service = db.scalar(query)
    if service is None:
        raise HTTPException(404, "Service not found")
    return service


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        sqlstate = getattr(exc.orig, "sqlstate", None) or getattr(exc.orig, "pgcode", None)
        if sqlstate == "23505":
            raise HTTPException(409, "A conflicting service record already exists") from exc
        raise


def create_catalog_entry(db: Session, data: ServiceCreate) -> ServiceRead:
    service = Service(**data.model_dump(), is_active=True)
    db.add(service)
    _commit(db)
    return ServiceRead.model_validate(service)


def update_catalog_entry(
    db: Session, service_id: int, data: ServicePatch
) -> ServiceRead:
    service = _catalog_entry(db, service_id, lock=True)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    _commit(db)
    return ServiceRead.model_validate(service)


def deactivate_catalog_entry(db: Session, service_id: int) -> ServiceRead:
    return update_catalog_entry(db, service_id, ServicePatch(is_active=False))


def _approved_provider(db: Session, user: User, *, lock: bool = False) -> int:
    allowed_types = {"COMPANY_MANAGER": "COMPANY", "INDIVIDUAL_PROVIDER": "INDIVIDUAL"}
    provider_type = allowed_types.get(user.role)
    if provider_type is None or user.provider_id is None:
        raise HTTPException(403, "Provider management access required")
    query = select(Provider.id).where(
        Provider.id == user.provider_id,
        Provider.type == provider_type,
        Provider.verification_status == "APPROVED",
    )
    if lock:
        query = query.with_for_update()
    provider_id = db.scalar(query)
    if provider_id is None:
        raise HTTPException(403, "An approved provider is required")
    return provider_id


def _offering_result(offer: ProviderService, service: Service) -> OfferingRead:
    return OfferingRead(
        id=offer.id,
        service_id=offer.service_id,
        service_name=service.name,
        description=offer.description,
        starting_price=offer.starting_price,
        is_active=offer.is_active,
        catalog_is_active=service.is_active,
    )


def list_offerings(db: Session, user: User) -> list[OfferingRead]:
    provider_id = _approved_provider(db, user)
    rows = db.execute(
        select(ProviderService, Service)
        .join(Service, Service.id == ProviderService.service_id)
        .where(ProviderService.provider_id == provider_id)
        .order_by(Service.name, ProviderService.id)
    )
    return [_offering_result(offer, service) for offer, service in rows]


def create_offering(db: Session, user: User, data: OfferingCreate) -> OfferingRead:
    provider_id = _approved_provider(db, user, lock=True)
    service = _catalog_entry(db, data.service_id, lock=True)
    if not service.is_active:
        raise HTTPException(409, "Catalogue service is inactive")
    existing = db.scalar(
        select(ProviderService.id).where(
            ProviderService.provider_id == provider_id,
            ProviderService.service_id == service.id,
        )
    )
    if existing is not None:
        raise HTTPException(409, "This provider already offers that service")
    offer = ProviderService(provider_id=provider_id, **data.model_dump(), is_active=True)
    db.add(offer)
    _commit(db)
    return _offering_result(offer, service)


def update_offering(
    db: Session, user: User, offering_id: int, data: OfferingPatch
) -> OfferingRead:
    provider_id = _approved_provider(db, user, lock=True)
    offer = db.scalar(
        select(ProviderService).where(
            ProviderService.id == offering_id,
            ProviderService.provider_id == provider_id,
        )
    )
    if offer is None:
        raise HTTPException(404, "Offering not found")
    service = _catalog_entry(db, offer.service_id, lock=True)
    if data.is_active is True and not service.is_active:
        raise HTTPException(409, "Catalogue service is inactive")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(offer, field, value)
    _commit(db)
    return _offering_result(offer, service)


def _directory_query(service_id: int | None = None):
    price_query = (
        select(
            ProviderService.provider_id,
            func.min(ProviderService.starting_price).label("starting_price"),
        )
        .join(Service, Service.id == ProviderService.service_id)
        .where(ProviderService.is_active.is_(True), Service.is_active.is_(True))
        .group_by(ProviderService.provider_id)
    )
    if service_id is not None:
        price_query = price_query.where(ProviderService.service_id == service_id)
    prices = price_query.subquery()

    stats = (
        select(
            Job.provider_id,
            func.avg(Job.rating).label("rating"),
            func.count(Job.id).label("completed_jobs"),
        )
        .where(Job.status == "COMPLETED")
        .group_by(Job.provider_id)
        .subquery()
    )
    completed_jobs = func.coalesce(stats.c.completed_jobs, 0)
    query = (
        select(Provider, stats.c.rating, completed_jobs, prices.c.starting_price)
        .outerjoin(stats, stats.c.provider_id == Provider.id)
        .outerjoin(prices, prices.c.provider_id == Provider.id)
        .where(Provider.verification_status == "APPROVED")
    )
    if service_id is not None:
        query = query.where(prices.c.provider_id.is_not(None))
    return query, {
        "rating": stats.c.rating.desc().nulls_last(),
        "starting_price": prices.c.starting_price.asc().nulls_last(),
        "completed_jobs": completed_jobs.desc(),
    }


def _provider_summary(provider, rating, completed_jobs, starting_price) -> ProviderSummary:
    return ProviderSummary(
        id=provider.id,
        type=provider.type,
        name=provider.name,
        description=provider.description,
        accepting_requests=provider.accepting_requests,
        rating=float(rating) if rating is not None else None,
        completed_jobs=completed_jobs,
        starting_price=starting_price,
    )


def search_providers(
    db: Session,
    *,
    q: str | None,
    service_id: int | None,
    area: str | None,
    provider_type: ProviderType | None,
    sort_by: ProviderSort,
    limit: int,
    offset: int,
) -> list[ProviderSummary]:
    query, sorting = _directory_query(service_id)
    if q and q.strip():
        query = query.where(Provider.name.icontains(q.strip(), autoescape=True))
    if area and area.strip():
        area_match = select(ProviderArea.id).where(
            ProviderArea.provider_id == Provider.id,
            func.lower(ProviderArea.area_name) == area.strip().lower(),
        ).exists()
        query = query.where(area_match)
    if provider_type is not None:
        query = query.where(Provider.type == provider_type)
    rows = db.execute(
        query.order_by(sorting[sort_by], Provider.id).limit(limit).offset(offset)
    )
    return [_provider_summary(*row) for row in rows]


def public_provider(db: Session, provider_id: int) -> ProviderDetail:
    query, _ = _directory_query()
    row = db.execute(query.where(Provider.id == provider_id)).one_or_none()
    if row is None:
        raise HTTPException(404, "Provider not found")
    provider = row[0]
    summary = _provider_summary(*row)

    areas = db.scalars(
        select(ProviderArea.area_name)
        .where(ProviderArea.provider_id == provider_id)
        .order_by(ProviderArea.area_name)
    ).all()
    offerings = db.execute(
        select(ProviderService, Service)
        .join(Service, Service.id == ProviderService.service_id)
        .where(
            ProviderService.provider_id == provider_id,
            ProviderService.is_active.is_(True),
            Service.is_active.is_(True),
        )
        .order_by(Service.name, ProviderService.id)
    )
    policies = db.scalars(
        select(Policy)
        .where(
            Policy.provider_id == provider_id,
            Policy.visibility == "PUBLIC",
            Policy.status == "ACTIVE",
        )
        .order_by(Policy.id)
    )
    return ProviderDetail(
        **summary.model_dump(),
        email=provider.email,
        phone=provider.phone,
        address=provider.address,
        areas=list(areas),
        services=[
            PublicOffering(
                id=offer.id,
                service_id=offer.service_id,
                service_name=service.name,
                description=offer.description,
                starting_price=offer.starting_price,
            )
            for offer, service in offerings
        ],
        policies=[PublicPolicy.model_validate(policy) for policy in policies],
    )
