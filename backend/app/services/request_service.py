"""ServiceFlow request rules, using the EXISTING 19-table PostgreSQL schema.

No existing ORM models are replaced. SQLAlchemy Core reflects the live tables so
this feature can be integrated without guessing the project's model declarations.
Run tools/check_request_schema.py before enabling the routes.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from functools import lru_cache
from typing import Any

from sqlalchemy import MetaData, Table, and_, func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.service_request import RequestCreate

PROVIDER_ROLES = frozenset({"INDIVIDUAL_PROVIDER", "COMPANY_MANAGER"})
REQUEST_STATUSES = frozenset({
    "NEW", "UNDER_REVIEW", "NEED_INFORMATION", "QUOTATION_SENT", "REJECTED", "CANCELLED"
})
TERMINAL_STATUSES = frozenset({"REJECTED", "CANCELLED"})
REVIEW_STATUSES = frozenset({"NEW", "UNDER_REVIEW", "NEED_INFORMATION"})
TABLE_NAMES = (
    "providers", "provider_services", "services", "service_requests",
    "request_messages", "request_attachments", "quotations", "jobs",
)


class RequestServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def fail(code: int, detail: str) -> None:
    raise RequestServiceError(code, detail)


@lru_cache(maxsize=16)
def _reflected_tables(engine: Any) -> dict[str, Table]:
    """Reflection is cached per engine; restart the server after migrations."""
    metadata = MetaData()
    return {name: Table(name, metadata, autoload_with=engine) for name in TABLE_NAMES}


def tables(db: Session) -> dict[str, Table]:
    return _reflected_tables(db.get_bind())


def _role(user: Any) -> str:
    return str(getattr(user, "role", ""))


def _provider_id(user: Any) -> int:
    provider_id = getattr(user, "provider_id", None)
    if provider_id is None:
        fail(403, "Your account is not linked to a provider")
    return int(provider_id)


def _require_client(user: Any) -> None:
    if _role(user) != "CLIENT":
        fail(403, "Only clients can perform this action")


def _require_provider(user: Any) -> None:
    if _role(user) not in PROVIDER_ROLES:
        fail(403, "Only individual providers and company managers can perform this action")
    _provider_id(user)


def _require_participant(user: Any) -> None:
    if _role(user) not in PROVIDER_ROLES | {"CLIENT"}:
        fail(403, "Your role cannot access service requests")


def _scope_condition(requests: Table, user: Any):
    _require_participant(user)
    if _role(user) == "CLIENT":
        return requests.c.client_id == int(user.id)
    return requests.c.provider_id == _provider_id(user)


def _row_dict(row: Any) -> dict[str, Any]:
    data = dict(row)
    # The proposal names the reason concept, not the physical column names.
    if "rejection_reason" not in data:
        data["rejection_reason"] = data.get("reject_reason")
    if "cancellation_reason" not in data:
        data["cancellation_reason"] = data.get("cancel_reason")
    return data


def _find_request(db: Session, request_id: int, user: Any, *, lock: bool = False) -> dict[str, Any]:
    requests = tables(db)["service_requests"]
    stmt = select(requests).where(
        requests.c.id == request_id,
        _scope_condition(requests, user),
    )
    if lock:
        stmt = stmt.with_for_update()
    row = db.execute(stmt).mappings().first()
    if row is None:
        # A 404 also prevents leaking whether another tenant's request exists.
        fail(404, "Request not found")
    return _row_dict(row)


def _provider_can_write(db: Session, user: Any) -> None:
    if _role(user) not in PROVIDER_ROLES:
        return
    provider = tables(db)["providers"]
    row = db.execute(select(provider.c.verification_status).where(
        provider.c.id == _provider_id(user)
    )).first()
    if row is None or row[0] != "APPROVED":
        fail(403, "Provider is not approved for operational actions")


def _reason_field(requests: Table, kind: str) -> str | None:
    alternatives = {
        "rejection": ("rejection_reason", "reject_reason"),
        "cancellation": ("cancellation_reason", "cancel_reason"),
    }[kind]
    return next((name for name in alternatives if name in requests.c), None)


def _update_status(db: Session, request_id: int, status: str, *, kind: str | None = None,
                   reason: str | None = None, user_id: int | None = None) -> None:
    requests = tables(db)["service_requests"]
    values: dict[str, Any] = {"status": status}
    if "updated_at" in requests.c:
        values["updated_at"] = datetime.now(timezone.utc)
    if kind and reason is not None:
        col = _reason_field(requests, kind)
        if col is None:
            fail(500, f"Missing {kind} reason column in service_requests; check database schema")
        values[col] = reason
    if kind == "cancellation":
        for col in ("cancelled_by_user_id", "cancelled_by"):
            if col in requests.c and user_id is not None:
                values[col] = user_id
                break
        if "cancelled_at" in requests.c:
            values["cancelled_at"] = datetime.now(timezone.utc)
    if kind == "rejection" and "rejected_at" in requests.c:
        values["rejected_at"] = datetime.now(timezone.utc)
    db.execute(update(requests).where(requests.c.id == request_id).values(**values))


def _quotation_approved_or_job_exists(db: Session, request_id: int) -> bool:
    t = tables(db)
    quotations = t["quotations"]
    jobs = t["jobs"]
    approved = db.execute(select(quotations.c.id).where(
        quotations.c.request_id == request_id,
        quotations.c.status == "APPROVED",
    ).limit(1)).first()
    if approved is not None:
        return True
    return db.execute(select(jobs.c.id).where(jobs.c.request_id == request_id).limit(1)).first() is not None


def create_request(db: Session, user: Any, data: RequestCreate) -> dict[str, Any]:
    _require_client(user)
    if data.preferred_date < date.today():
        fail(422, "preferred_date must be today or a future date")
    t = tables(db)
    providers, services, offers, requests = (
        t["providers"], t["services"], t["provider_services"], t["service_requests"]
    )
    provider = db.execute(select(providers).where(
        providers.c.id == data.provider_id
    ).with_for_update()).mappings().first()
    if provider is None:
        fail(404, "Provider not found")
    if provider["verification_status"] != "APPROVED":
        fail(409, "Provider is not approved")
    if not provider["accepting_requests"]:
        fail(409, "Provider is not accepting new requests")
    service = db.execute(select(services.c.id, services.c.is_active).where(
        services.c.id == data.service_id
    )).mappings().first()
    if service is None or not service["is_active"]:
        fail(422, "Service does not exist or is inactive")
    offer = db.execute(select(offers.c.provider_id).where(
        offers.c.provider_id == data.provider_id,
        offers.c.service_id == data.service_id,
        offers.c.is_active.is_(True),
    ).limit(1)).first()
    if offer is None:
        fail(422, "Provider does not actively offer this service")

    values = data.model_dump()
    values.update(client_id=int(user.id), status="NEW")
    try:
        request_id = db.execute(insert(requests).values(**values).returning(requests.c.id)).scalar_one()
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "Request could not be created due to a database constraint")
    return _find_request(db, request_id, user)


def list_requests(db: Session, user: Any, *, status: str | None, limit: int, offset: int) -> dict[str, Any]:
    t = tables(db)["service_requests"]
    scope = _scope_condition(t, user)
    filters = [scope]
    if status is not None:
        if status not in REQUEST_STATUSES:
            fail(422, "Invalid request status")
        filters.append(t.c.status == status)
    total = db.scalar(select(func.count()).select_from(t).where(*filters)) or 0
    items = db.execute(select(t).where(*filters).order_by(t.c.created_at.desc(), t.c.id.desc())
                       .limit(limit).offset(offset)).mappings().all()
    return {"items": [_row_dict(row) for row in items], "total": total, "limit": limit, "offset": offset}


def get_request(db: Session, user: Any, request_id: int) -> dict[str, Any]:
    record = _find_request(db, request_id, user)
    attachments = tables(db)["request_attachments"]
    rows = db.execute(select(attachments).where(
        attachments.c.request_id == request_id
    ).order_by(attachments.c.id)).mappings().all()
    record["attachments"] = [{k: row[k] for k in (
        "id", "request_id", "file_name", "content_type", "created_at"
    )} for row in rows]
    return record


def _insert_message(db: Session, user: Any, request_id: int, message_text: str) -> int:
    messages = tables(db)["request_messages"]
    return db.execute(insert(messages).values(
        request_id=request_id, sender_user_id=int(user.id), message_text=message_text,
    ).returning(messages.c.id)).scalar_one()


def send_message(db: Session, user: Any, request_id: int, message_text: str) -> dict[str, Any]:
    record = _find_request(db, request_id, user, lock=True)
    _provider_can_write(db, user)
    if record["status"] in TERMINAL_STATUSES:
        fail(409, "Cannot message a cancelled or rejected request")
    try:
        message_id = _insert_message(db, user, request_id, message_text)
        if _role(user) == "CLIENT" and record["status"] == "NEED_INFORMATION":
            _update_status(db, request_id, "UNDER_REVIEW")
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "Message could not be saved")
    messages = tables(db)["request_messages"]
    return dict(db.execute(select(messages).where(messages.c.id == message_id)).mappings().one())


def list_messages(db: Session, user: Any, request_id: int, *, limit: int, offset: int) -> dict[str, Any]:
    _find_request(db, request_id, user)
    messages = tables(db)["request_messages"]
    total = db.scalar(select(func.count()).select_from(messages).where(messages.c.request_id == request_id)) or 0
    rows = db.execute(select(messages).where(messages.c.request_id == request_id)
                      .order_by(messages.c.created_at, messages.c.id)
                      .limit(limit).offset(offset)).mappings().all()
    return {"items": [dict(row) for row in rows], "total": total, "limit": limit, "offset": offset}


def cancel_request(db: Session, user: Any, request_id: int, reason: str | None) -> dict[str, Any]:
    _require_client(user)
    record = _find_request(db, request_id, user, lock=True)
    if record["status"] in TERMINAL_STATUSES:
        fail(409, "Request is already cancelled or rejected")
    if _quotation_approved_or_job_exists(db, request_id):
        fail(409, "Quotation was approved; use the job cancellation workflow")
    _update_status(db, request_id, "CANCELLED", kind="cancellation", reason=reason, user_id=user.id)
    db.commit()
    return _find_request(db, request_id, user)


def reject_request(db: Session, user: Any, request_id: int, reason: str) -> dict[str, Any]:
    _require_provider(user)
    record = _find_request(db, request_id, user, lock=True)
    _provider_can_write(db, user)
    if record["status"] not in REVIEW_STATUSES:
        fail(409, "Provider may reject only during request review")
    quotations = tables(db)["quotations"]
    issued = db.execute(select(quotations.c.id).where(
        quotations.c.request_id == request_id,
        quotations.c.status.in_(["SENT", "APPROVED"]),
    ).limit(1)).first()
    if issued or _quotation_approved_or_job_exists(db, request_id):
        fail(409, "Request already has an issued or approved quotation/job")
    _update_status(db, request_id, "REJECTED", kind="rejection", reason=reason)
    db.commit()
    return _find_request(db, request_id, user)


# Optional extensions; register only after team agreement on their API contract.
def start_review(db: Session, user: Any, request_id: int) -> dict[str, Any]:
    _require_provider(user)
    record = _find_request(db, request_id, user, lock=True)
    _provider_can_write(db, user)
    if record["status"] not in {"NEW", "UNDER_REVIEW"}:
        fail(409, "Only new requests can enter review")
    if record["status"] == "NEW":
        _update_status(db, request_id, "UNDER_REVIEW")
        db.commit()
    return _find_request(db, request_id, user)


def request_more_information(db: Session, user: Any, request_id: int, message_text: str) -> dict[str, Any]:
    _require_provider(user)
    record = _find_request(db, request_id, user, lock=True)
    _provider_can_write(db, user)
    if record["status"] not in REVIEW_STATUSES:
        fail(409, "Cannot request information at this stage")
    try:
        _insert_message(db, user, request_id, message_text)
        _update_status(db, request_id, "NEED_INFORMATION")
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "Information request could not be saved")
    return _find_request(db, request_id, user)


def check_client_can_upload(db: Session, user: Any, request_id: int) -> None:
    _require_client(user)
    record = _find_request(db, request_id, user, lock=True)
    if record["status"] in TERMINAL_STATUSES or _quotation_approved_or_job_exists(db, request_id):
        fail(409, "Attachments cannot be added after cancellation, rejection or quotation approval")


def list_attachments(db: Session, user: Any, request_id: int) -> list[dict[str, Any]]:
    _find_request(db, request_id, user)
    attachments = tables(db)["request_attachments"]
    rows = db.execute(select(attachments).where(
        attachments.c.request_id == request_id
    ).order_by(attachments.c.id)).mappings().all()
    return [{k: row[k] for k in ("id", "request_id", "file_name", "content_type", "created_at")}
            for row in rows]


def get_attachment_for_download(db: Session, user: Any, request_id: int, attachment_id: int) -> dict[str, Any]:
    _find_request(db, request_id, user)
    attachments = tables(db)["request_attachments"]
    row = db.execute(select(attachments).where(
        attachments.c.id == attachment_id,
        attachments.c.request_id == request_id,
    )).mappings().first()
    if row is None:
        fail(404, "Attachment not found")
    return dict(row)
