"""ServiceFlow quotation rules, using the existing relational schema.

The service reflects existing tables; it does not redefine ORM models or alter
Alembic history. Run tools/check_quotation_schema.py before registering routes.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from functools import lru_cache
from typing import Any

from sqlalchemy import MetaData, Table, delete, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.quotation import QuotationCreate, QuotationUpdate

from app.services.notification_events import (
    NotificationType,
    create_notification,
    notify_provider_owners,
)

PROVIDER_ROLES = frozenset({"INDIVIDUAL_PROVIDER", "COMPANY_MANAGER"})
CLIENT_ROLE = "CLIENT"
ACTIVE_QUOTATION_STATUSES = frozenset({"DRAFT", "SENT", "APPROVED"})
QUOTE_STATUSES = frozenset({"DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"})
TABLE_NAMES = ("users", "providers", "service_requests", "quotations", "quotation_items", "jobs")
CENT = Decimal("0.01")


class QuotationServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def fail(code: int, detail: str) -> None:
    raise QuotationServiceError(code, detail)


@lru_cache(maxsize=16)
def _reflected_tables(engine: Any) -> dict[str, Table]:
    metadata = MetaData()
    return {name: Table(name, metadata, autoload_with=engine) for name in TABLE_NAMES}


def tables(db: Session) -> dict[str, Table]:
    return _reflected_tables(db.get_bind())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    # SQLite test databases may return naive values even for timezone=True;
    # PostgreSQL timestamptz returns aware values. Treat naive DB values as UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def _item_value(item: Any, key: str) -> Any:
    return item[key] if isinstance(item, dict) else getattr(item, key)


def _calculate(items: list[Any]) -> Decimal:
    total = sum((Decimal(str(_item_value(item, "quantity"))) *
                 Decimal(str(_item_value(item, "unit_price"))) for item in items), Decimal("0"))
    return _money(total)


def _role(user: Any) -> str:
    return str(getattr(user, "role", ""))


def _provider_id(user: Any) -> int:
    value = getattr(user, "provider_id", None)
    if value is None:
        fail(403, "Your account is not linked to a provider")
    return int(value)


def _require_provider(user: Any) -> int:
    if _role(user) not in PROVIDER_ROLES:
        fail(403, "Only individual providers and company managers can manage quotations")
    return _provider_id(user)


def _require_client(user: Any) -> None:
    if _role(user) != CLIENT_ROLE:
        fail(403, "Only clients can approve or decline quotations")


def _scope_request(user: Any, request: dict[str, Any]) -> None:
    role = _role(user)
    if role == CLIENT_ROLE:
        if int(request["client_id"]) != int(user.id):
            fail(404, "Quotation not found")
        return
    if role in PROVIDER_ROLES:
        if int(request["provider_id"]) != _provider_id(user):
            fail(404, "Quotation not found")
        return
    fail(403, "Your role cannot access quotations")


def _get_request(db: Session, request_id: int, *, lock: bool) -> dict[str, Any]:
    request_table = tables(db)["service_requests"]
    stmt = select(request_table).where(request_table.c.id == request_id)
    if lock:
        stmt = stmt.with_for_update()
    row = db.execute(stmt).mappings().first()
    if row is None:
        fail(404, "Service request not found")
    return dict(row)


def _get_quote_and_request(db: Session, user: Any, quotation_id: int, *, lock: bool = False):
    t = tables(db)
    # Read request_id first, then lock in the same order as create/approve:
    # request row before quotation row. This serializes quote lifecycle changes.
    quote_row = db.execute(select(t["quotations"]).where(
        t["quotations"].c.id == quotation_id
    )).mappings().first()
    if quote_row is None:
        fail(404, "Quotation not found")
    request = _get_request(db, int(quote_row["request_id"]), lock=lock)
    _scope_request(user, request)
    quote_stmt = select(t["quotations"]).where(t["quotations"].c.id == quotation_id)
    if lock:
        quote_stmt = quote_stmt.with_for_update()
    quote_row = db.execute(quote_stmt).mappings().first()
    if quote_row is None:
        fail(404, "Quotation not found")
    return dict(quote_row), request


def _provider_is_approved(db: Session, provider_id: int) -> dict[str, Any]:
    providers = tables(db)["providers"]
    row = db.execute(select(providers).where(providers.c.id == provider_id)).mappings().first()
    if row is None:
        fail(404, "Provider not found")
    provider = dict(row)
    if provider.get("verification_status") != "APPROVED":
        fail(403, "Provider is not approved for quotation operations")
    return provider


def _set_request_status(db: Session, request_id: int, status: str) -> None:
    requests = tables(db)["service_requests"]
    values: dict[str, Any] = {"status": status}
    if "updated_at" in requests.c:
        values["updated_at"] = _now()
    db.execute(update(requests).where(requests.c.id == request_id).values(**values))


def _quote_items(db: Session, quotation_id: int) -> list[dict[str, Any]]:
    item_table = tables(db)["quotation_items"]
    rows = db.execute(select(item_table).where(
        item_table.c.quotation_id == quotation_id
    ).order_by(item_table.c.id)).mappings().all()
    result = []
    for row in rows:
        item = dict(row)
        item["line_total"] = _money(Decimal(str(item["quantity"])) * Decimal(str(item["unit_price"])))
        result.append(item)
    return result


def _job_id(db: Session, quotation_id: int) -> int | None:
    jobs = tables(db)["jobs"]
    row = db.execute(select(jobs.c.id).where(jobs.c.quotation_id == quotation_id).limit(1)).first()
    return int(row[0]) if row else None


def _response(db: Session, quotation: dict[str, Any]) -> dict[str, Any]:
    result = dict(quotation)
    result["items"] = _quote_items(db, int(quotation["id"]))
    result["job_id"] = _job_id(db, int(quotation["id"]))
    return result


def _expire_if_needed(db: Session, quotation: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    if quotation["status"] == "SENT" and _aware(quotation["valid_until"]) <= _now():
        quotes = tables(db)["quotations"]
        values: dict[str, Any] = {"status": "EXPIRED"}
        if "updated_at" in quotes.c:
            values["updated_at"] = _now()
        db.execute(update(quotes).where(quotes.c.id == quotation["id"]).values(**values))
        if request.get("status") == "QUOTATION_SENT":
            _set_request_status(db, int(request["id"]), "UNDER_REVIEW")
        db.commit()
        quotation["status"] = "EXPIRED"
    return quotation


def _ensure_amounts(items: list[Any], downpayment: Decimal | None) -> Decimal:
    subtotal = _calculate(items)
    if downpayment is not None and _money(downpayment) > subtotal:
        fail(422, "downpayment_amount cannot exceed total_amount")
    return subtotal


def _insert_items(db: Session, quotation_id: int, items: list[Any]) -> None:
    item_table = tables(db)["quotation_items"]
    for item in items:
        values = {
            "quotation_id": quotation_id,
            "description": item.description.strip(),
            "quantity": Decimal(str(item.quantity)),
            "unit_price": _money(item.unit_price),
        }
        db.execute(insert(item_table).values(**values))


def create_quotation(db: Session, user: Any, request_id: int, data: QuotationCreate) -> dict[str, Any]:
    provider_id = _require_provider(user)
    provider = _provider_is_approved(db, provider_id)
    request = _get_request(db, request_id, lock=True)
    if int(request["provider_id"]) != provider_id:
        fail(404, "Service request not found")
    if request["status"] in {"CANCELLED", "REJECTED"}:
        fail(409, "Cannot quote a cancelled or rejected request")
    if _job_for_request(db, request_id) is not None:
        fail(409, "A job already exists for this request")

    quotes = tables(db)["quotations"]
    existing_rows = db.execute(select(quotes).where(
        quotes.c.request_id == request_id
    ).order_by(quotes.c.created_at.desc(), quotes.c.id.desc()).with_for_update()).mappings().all()
    for row in existing_rows:
        existing = dict(row)
        if existing["status"] == "SENT" and _aware(existing["valid_until"]) <= _now():
            values = {"status": "EXPIRED"}
            if "updated_at" in quotes.c:
                values["updated_at"] = _now()
            db.execute(update(quotes).where(quotes.c.id == existing["id"]).values(**values))
            if request.get("status") == "QUOTATION_SENT":
                _set_request_status(db, request_id, "UNDER_REVIEW")
            continue
        if existing["status"] in ACTIVE_QUOTATION_STATUSES:
            fail(409, "An active quotation already exists for this request")
        if existing["status"] in {"DECLINED", "EXPIRED"} and request.get("status") == "QUOTATION_SENT":
            _set_request_status(db, request_id, "UNDER_REVIEW")

    request = _get_request(db, request_id, lock=True)
    if request["status"] not in {"NEW", "UNDER_REVIEW"}:
        fail(409, "A quotation can be created only while the request is NEW or UNDER_REVIEW")

    subtotal = _ensure_amounts(data.items, data.downpayment_amount)
    now = _now()
    values = {
        "request_id": request_id,
        "status": "DRAFT",
        "subtotal": subtotal,
        "total_amount": subtotal,
        "valid_until": data.valid_until,
        "downpayment_amount": _money(data.downpayment_amount) if data.downpayment_amount is not None else None,
        "note": data.note,
    }
    if "created_at" in quotes.c:
        values["created_at"] = now
    if "updated_at" in quotes.c:
        values["updated_at"] = now
    try:
        quotation_id = db.execute(insert(quotes).values(**values).returning(quotes.c.id)).scalar_one()
        _insert_items(db, quotation_id, data.items)
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "An active quotation already exists or a database constraint was violated")
    quote, _ = _get_quote_and_request(db, user, quotation_id)
    return _response(db, quote)


def list_request_quotations(db: Session, user: Any, request_id: int) -> list[dict[str, Any]]:
    """List quotations for a request after enforcing the request tenant scope.

    Providers see all their request quotations. Clients do not see provider
    drafts, matching the existing get_quotation() visibility rule.
    """
    request = _get_request(db, request_id, lock=False)
    _scope_request(user, request)

    quote_table = tables(db)["quotations"]
    stmt = select(quote_table).where(
        quote_table.c.request_id == request_id
    )
    if _role(user) == CLIENT_ROLE:
        stmt = stmt.where(quote_table.c.status != "DRAFT")

    rows = db.execute(
        stmt.order_by(quote_table.c.created_at.desc(), quote_table.c.id.desc())
    ).mappings().all()

    results: list[dict[str, Any]] = []
    for row in rows:
        quote = dict(row)
        quote = _expire_if_needed(db, quote, request)
        # Re-read after expiry transition so response reflects persisted status.
        fresh = db.execute(
            select(quote_table).where(quote_table.c.id == quote["id"])
        ).mappings().one()
        results.append(_response(db, dict(fresh)))

    return results


def get_quotation(db: Session, user: Any, quotation_id: int) -> dict[str, Any]:
    quote, request = _get_quote_and_request(db, user, quotation_id)
    if _role(user) == CLIENT_ROLE and quote["status"] == "DRAFT":
        fail(404, "Quotation not found")
    quote = _expire_if_needed(db, quote, request)
    fresh = db.execute(select(tables(db)["quotations"]).where(
        tables(db)["quotations"].c.id == quotation_id
    )).mappings().one()
    return _response(db, dict(fresh))


def update_draft_quotation(db: Session, user: Any, quotation_id: int, data: QuotationUpdate) -> dict[str, Any]:
    provider_id = _require_provider(user)
    quote, request = _get_quote_and_request(db, user, quotation_id, lock=True)
    _provider_is_approved(db, provider_id)
    if quote["status"] != "DRAFT":
        fail(409, "Only DRAFT quotations can be edited")
    if request["status"] in {"CANCELLED", "REJECTED"}:
        fail(409, "Cannot edit a quotation for a cancelled or rejected request")
    fields = data.model_fields_set
    values: dict[str, Any] = {}
    items = data.items if "items" in fields else _quote_items(db, quotation_id)
    if "items" in fields and data.items is None:
        fail(422, "items cannot be null; provide at least one line item")
    valid_until = data.valid_until if "valid_until" in fields else quote["valid_until"]
    if valid_until is None or _aware(valid_until) <= _now():
        fail(422, "valid_until must be in the future")
    downpayment = data.downpayment_amount if "downpayment_amount" in fields else quote["downpayment_amount"]
    subtotal = _ensure_amounts(items, downpayment)
    values["subtotal"] = subtotal
    values["total_amount"] = subtotal
    if "valid_until" in fields:
        values["valid_until"] = data.valid_until
    if "downpayment_amount" in fields:
        values["downpayment_amount"] = _money(data.downpayment_amount) if data.downpayment_amount is not None else None
    if "note" in fields:
        values["note"] = data.note
    if "updated_at" in tables(db)["quotations"].c:
        values["updated_at"] = _now()
    if data.status == "SENT":
        values["status"] = "SENT"
    try:
        quotes = tables(db)["quotations"]
        db.execute(update(quotes).where(quotes.c.id == quotation_id).values(**values))
        if "items" in fields:
            item_table = tables(db)["quotation_items"]
            db.execute(delete(item_table).where(item_table.c.quotation_id == quotation_id))
            _insert_items(db, quotation_id, data.items)
        if data.status == "SENT":
            _set_request_status(db, int(request["id"]), "QUOTATION_SENT")
            create_notification(
                db,
                user_id=int(request["client_id"]),
                title="Quotation Received",
                message=f"You received a quotation #{quotation_id}.",
                notification_type=NotificationType.QUOTATION_SENT,
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "Quotation update violated a database constraint")
    fresh = db.execute(select(tables(db)["quotations"]).where(
        tables(db)["quotations"].c.id == quotation_id
    )).mappings().one()
    return _response(db, dict(fresh))


def _job_for_request(db: Session, request_id: int) -> dict[str, Any] | None:
    jobs = tables(db)["jobs"]
    row = db.execute(select(jobs).where(jobs.c.request_id == request_id).limit(1)).mappings().first()
    return dict(row) if row else None


def _create_job_for_approved_quote(db: Session, quote: dict[str, Any], request: dict[str, Any]) -> int:
    t = tables(db)
    providers = t["providers"]
    provider_row = db.execute(select(providers).where(
        providers.c.id == request["provider_id"]
    )).mappings().first()
    if provider_row is None:
        fail(409, "The request provider no longer exists")
    provider_type = provider_row["type"]
    assigned_user_id = None
    if provider_type == "INDIVIDUAL":
        users = t["users"]
        worker = db.execute(select(users.c.id).where(
            users.c.provider_id == request["provider_id"],
            users.c.role == "INDIVIDUAL_PROVIDER",
            users.c.status == "ACTIVE",
        ).limit(1)).first()
        if worker is None:
            fail(409, "The individual provider account is not active; job cannot be created")
        assigned_user_id = int(worker[0])

    jobs = t["jobs"]
    values: dict[str, Any] = {
        "request_id": int(request["id"]),
        "quotation_id": int(quote["id"]),
        "provider_id": int(request["provider_id"]),
        "status": "JOB_CREATED",
    }
    if "assigned_user_id" in jobs.c:
        if assigned_user_id is not None or jobs.c.assigned_user_id.nullable:
            values["assigned_user_id"] = assigned_user_id
    # Scheduling happens after job creation. Null is appropriate only when the
    # existing schema allows it; otherwise the schema checker flags the gap.
    for col in ("schedule_date", "schedule_time"):
        if col in jobs.c and jobs.c[col].nullable:
            values[col] = None
    if "created_at" in jobs.c:
        values["created_at"] = _now()
    if "updated_at" in jobs.c:
        values["updated_at"] = _now()

    # The proposal lists schedule_status but does not define its initial enum
    # value. Use the DB's declared server default; do not invent a new value.
    if "schedule_status" in jobs.c:
        col = jobs.c["schedule_status"]
        if col.nullable:
            values["schedule_status"] = None
        elif col.server_default is None:
            fail(500, "jobs.schedule_status is NOT NULL without a database default; agree its initial value before enabling quotation approval")

    for col in jobs.columns:
        if (not col.nullable and col.name not in values and col.name != "id"
                and col.server_default is None and col.default is None
                and col.computed is None and col.identity is None):
            fail(500, f"jobs.{col.name} is required but its initial value is not defined by the quotation/job contract")

    result = db.execute(insert(jobs).values(**values).returning(jobs.c.id))
    return int(result.scalar_one())


def approve_quotation(db: Session, user: Any, quotation_id: int) -> dict[str, Any]:
    _require_client(user)
    quote, request = _get_quote_and_request(db, user, quotation_id, lock=True)
    quote = _expire_if_needed(db, quote, request)
    if quote["status"] == "EXPIRED":
        fail(409, "Quotation has expired and cannot be approved")
    if quote["status"] != "SENT":
        fail(409, "Only SENT quotations can be approved")
    if request["status"] in {"CANCELLED", "REJECTED"}:
        fail(409, "The request is cancelled or rejected")
    if _job_for_request(db, int(request["id"])) is not None:
        fail(409, "A job already exists for this request")
    quotes = tables(db)["quotations"]
    try:
        approval_values: dict[str, Any] = {"status": "APPROVED"}
        if "updated_at" in quotes.c:
            approval_values["updated_at"] = _now()
        db.execute(update(quotes).where(quotes.c.id == quotation_id).values(**approval_values))
        job_id = _create_job_for_approved_quote(db, quote, request)
        notify_provider_owners(
            db,
            provider_id=int(request["provider_id"]),
            title="Quotation Approved",
            message=f"Your quotation #{quotation_id} has been approved.",
            notification_type=NotificationType.QUOTATION_APPROVED,
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "Quotation approval could not create a unique job")
    except QuotationServiceError:
        db.rollback()
        raise
    fresh = db.execute(select(quotes).where(quotes.c.id == quotation_id)).mappings().one()
    result = _response(db, dict(fresh))
    result["job_id"] = job_id
    return result


def decline_quotation(db: Session, user: Any, quotation_id: int) -> dict[str, Any]:
    _require_client(user)
    quote, request = _get_quote_and_request(db, user, quotation_id, lock=True)
    quote = _expire_if_needed(db, quote, request)
    if quote["status"] == "EXPIRED":
        fail(409, "Quotation has expired and cannot be declined")
    if quote["status"] != "SENT":
        fail(409, "Only SENT quotations can be declined")
    if request["status"] in {"CANCELLED", "REJECTED"}:
        fail(409, "The request is cancelled or rejected")
    quotes = tables(db)["quotations"]
    values: dict[str, Any] = {"status": "DECLINED"}
    if "updated_at" in quotes.c:
        values["updated_at"] = _now()
    try:
        db.execute(update(quotes).where(quotes.c.id == quotation_id).values(**values))
        if request["status"] == "QUOTATION_SENT":
            # The proposal permits a declined quotation to be replaced. Return the
            # request to provider review so another quotation can be prepared.
            _set_request_status(db, int(request["id"]), "UNDER_REVIEW")
        notify_provider_owners(
            db,
            provider_id=int(request["provider_id"]),
            title="Quotation Declined",
            message=f"Your quotation #{quotation_id} has been declined.",
            notification_type=NotificationType.QUOTATION_DECLINED,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    fresh = db.execute(select(quotes).where(quotes.c.id == quotation_id)).mappings().one()
    return _response(db, dict(fresh))
