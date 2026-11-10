"""Run from backend/: python -m pytest -q tests/test_quotation_management.py"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, MetaData, Numeric,
    String, Table, Text, Time, create_engine, insert, select,
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import quotations
from app.core.dependencies import get_current_user
from app.database import get_db


@dataclass
class Actor:
    id: int
    role: str
    provider_id: int | None = None


CLIENT_A = Actor(100, "CLIENT")
CLIENT_B = Actor(101, "CLIENT")
MANAGER_A = Actor(201, "COMPANY_MANAGER", 1)
MANAGER_B = Actor(202, "COMPANY_MANAGER", 2)
INDIVIDUAL = Actor(301, "INDIVIDUAL_PROVIDER", 3)
EMPLOYEE = Actor(401, "EMPLOYEE", 1)
ADMIN = Actor(501, "SYSTEM_ADMIN")


def future_iso(days: int = 7) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def quote_payload(**changes):
    body = {
        "items": [
            {"description": "Replace kitchen tap", "quantity": 1, "unit_price": "8500.00"},
            {"description": "Labour", "quantity": 2, "unit_price": "2500.00"},
        ],
        "valid_until": future_iso(),
        "downpayment_amount": "3000.00",
        "note": "Includes parts and labour.",
    }
    body.update(changes)
    return body


@pytest.fixture
def api():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    metadata = MetaData()
    users = Table(
        "users", metadata,
        Column("id", Integer, primary_key=True),
        Column("provider_id", Integer),
        Column("role", String(30), nullable=False),
        Column("status", String(20), nullable=False),
    )
    providers = Table(
        "providers", metadata,
        Column("id", Integer, primary_key=True),
        Column("type", String(20), nullable=False),
        Column("verification_status", String(20), nullable=False),
    )
    requests = Table(
        "service_requests", metadata,
        Column("id", Integer, primary_key=True),
        Column("client_id", Integer, nullable=False),
        Column("provider_id", Integer, ForeignKey("providers.id"), nullable=False),
        Column("service_id", Integer, nullable=False),
        Column("status", String(30), nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )
    quotes = Table(
        "quotations", metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("request_id", Integer, ForeignKey("service_requests.id"), nullable=False),
        Column("status", String(20), nullable=False),
        Column("subtotal", Numeric(12, 2), nullable=False),
        Column("total_amount", Numeric(12, 2), nullable=False),
        Column("valid_until", DateTime(timezone=True), nullable=False),
        Column("downpayment_amount", Numeric(12, 2)),
        Column("note", Text),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )
    items = Table(
        "quotation_items", metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("quotation_id", Integer, ForeignKey("quotations.id"), nullable=False),
        Column("description", String(500), nullable=False),
        Column("quantity", Numeric(10, 3), nullable=False),
        Column("unit_price", Numeric(12, 2), nullable=False),
    )
    jobs = Table(
        "jobs", metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("request_id", Integer, ForeignKey("service_requests.id"), nullable=False),
        Column("quotation_id", Integer, ForeignKey("quotations.id"), nullable=False, unique=True),
        Column("provider_id", Integer, ForeignKey("providers.id"), nullable=False),
        Column("assigned_user_id", Integer, ForeignKey("users.id"), nullable=True),
        Column("schedule_date", Date, nullable=True),
        Column("schedule_time", Time, nullable=True),
        Column("schedule_status", String(30), nullable=True),
        Column("status", String(30), nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
    )
    metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(insert(providers), [
            {"id": 1, "type": "COMPANY", "verification_status": "APPROVED"},
            {"id": 2, "type": "COMPANY", "verification_status": "APPROVED"},
            {"id": 3, "type": "INDIVIDUAL", "verification_status": "APPROVED"},
            {"id": 4, "type": "COMPANY", "verification_status": "SUSPENDED"},
        ])
        conn.execute(insert(users), [
            {"id": 201, "provider_id": 1, "role": "COMPANY_MANAGER", "status": "ACTIVE"},
            {"id": 202, "provider_id": 2, "role": "COMPANY_MANAGER", "status": "ACTIVE"},
            {"id": 301, "provider_id": 3, "role": "INDIVIDUAL_PROVIDER", "status": "ACTIVE"},
        ])
        conn.execute(insert(requests), [
            {"id": 1, "client_id": 100, "provider_id": 1, "service_id": 10,
             "status": "UNDER_REVIEW", "created_at": now, "updated_at": now},
            {"id": 2, "client_id": 101, "provider_id": 1, "service_id": 10,
             "status": "UNDER_REVIEW", "created_at": now, "updated_at": now},
            {"id": 3, "client_id": 100, "provider_id": 2, "service_id": 10,
             "status": "UNDER_REVIEW", "created_at": now, "updated_at": now},
            {"id": 4, "client_id": 100, "provider_id": 1, "service_id": 10,
             "status": "CANCELLED", "created_at": now, "updated_at": now},
            {"id": 5, "client_id": 100, "provider_id": 3, "service_id": 10,
             "status": "UNDER_REVIEW", "created_at": now, "updated_at": now},
        ])
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    state = {"user": MANAGER_A}
    app = FastAPI()
    app.include_router(quotations.router)

    def override_db():
        with factory() as db:
            yield db

    def override_user():
        return state["user"]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    with TestClient(app) as client:
        yield client, state, factory, {"quotes": quotes, "items": items, "jobs": jobs, "requests": requests}
    engine.dispose()


def create_draft(api, request_id=1, actor=MANAGER_A, **changes):
    client, state, _, _ = api
    state["user"] = actor
    response = client.post(f"/requests/{request_id}/quotations", json=quote_payload(**changes))
    assert response.status_code == 201, response.text
    return response.json()


def send_draft(api, quotation_id):
    api[1]["user"] = MANAGER_A if api[1]["user"].provider_id in (None, 1) else api[1]["user"]
    response = api[0].patch(f"/quotations/{quotation_id}", json={"status": "SENT"})
    assert response.status_code == 200, response.text
    return response.json()


def test_create_draft_calculates_subtotal_and_total(api):
    quote = create_draft(api)
    assert quote["status"] == "DRAFT"
    assert Decimal(quote["subtotal"]) == Decimal("13500.00")
    assert Decimal(quote["total_amount"]) == Decimal("13500.00")
    assert Decimal(quote["downpayment_amount"]) == Decimal("3000.00")
    assert len(quote["items"]) == 2
    assert Decimal(quote["items"][0]["line_total"]) == Decimal("8500.00")
    assert quote["job_id"] is None


def test_provider_can_edit_draft_items_and_send(api):
    quote = create_draft(api)
    response = api[0].patch(f"/quotations/{quote['id']}", json={
        "items": [{"description": "Replacement part", "quantity": 2, "unit_price": 100}],
        "note": "Revised estimate",
        "downpayment_amount": "100.00",
        "status": "SENT",
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "SENT"
    assert Decimal(data["subtotal"]) == Decimal("200.00")
    assert len(data["items"]) == 1
    with api[2]() as db:
        request_status = db.execute(select(api[3]["requests"].c.status).where(
            api[3]["requests"].c.id == 1
        )).scalar_one()
    assert request_status == "QUOTATION_SENT"


def test_client_cannot_see_draft_but_can_see_sent(api):
    quote = create_draft(api)
    client, state, _, _ = api
    state["user"] = CLIENT_A
    assert client.get(f"/quotations/{quote['id']}").status_code == 404
    send_draft(api, quote["id"])
    assert client.get(f"/quotations/{quote['id']}").status_code == 200


def test_sent_quote_is_locked(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    response = api[0].patch(f"/quotations/{quote['id']}", json={"note": "Changed"})
    assert response.status_code == 409


def test_approve_creates_exactly_one_job(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    client, state, factory, tables = api
    state["user"] = CLIENT_A
    response = client.post(f"/quotations/{quote['id']}/approve", json={})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "APPROVED"
    assert body["job_id"] is not None
    with factory() as db:
        jobs = db.execute(select(tables["jobs"])).mappings().all()
        assert len(jobs) == 1
        assert jobs[0]["quotation_id"] == quote["id"]
        assert jobs[0]["request_id"] == 1
        assert jobs[0]["provider_id"] == 1
        assert jobs[0]["status"] == "JOB_CREATED"
    again = client.post(f"/quotations/{quote['id']}/approve", json={})
    assert again.status_code == 409
    with factory() as db:
        assert len(db.execute(select(tables["jobs"])).all()) == 1


def test_individual_provider_job_is_self_assigned(api):
    quote = create_draft(api, request_id=5, actor=INDIVIDUAL)
    send_draft(api, quote["id"])
    client, state, factory, tables = api
    state["user"] = CLIENT_A
    response = client.post(f"/quotations/{quote['id']}/approve", json={})
    assert response.status_code == 200, response.text
    with factory() as db:
        job = db.execute(select(tables["jobs"]).where(
            tables["jobs"].c.quotation_id == quote["id"]
        )).mappings().one()
        assert job["assigned_user_id"] == 301


def test_declined_quote_can_be_replaced(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    client, state, _, tables = api
    state["user"] = CLIENT_A
    declined = client.post(f"/quotations/{quote['id']}/decline", json={})
    assert declined.status_code == 200
    assert declined.json()["status"] == "DECLINED"
    with api[2]() as db:
        status = db.execute(select(tables["requests"].c.status).where(
            tables["requests"].c.id == 1
        )).scalar_one()
    assert status == "UNDER_REVIEW"
    replacement = create_draft(api)
    assert replacement["id"] != quote["id"]


def test_duplicate_active_quote_rejected(api):
    create_draft(api)
    response = api[0].post("/requests/1/quotations", json=quote_payload())
    assert response.status_code == 409


def test_cross_provider_cannot_create_or_read(api):
    quote = create_draft(api)
    client, state, _, _ = api
    state["user"] = MANAGER_B
    assert client.get(f"/quotations/{quote['id']}").status_code == 404
    assert client.post("/requests/1/quotations", json=quote_payload()).status_code == 404


def test_cross_client_cannot_read_or_decide(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    client, state, _, _ = api
    state["user"] = CLIENT_B
    assert client.get(f"/quotations/{quote['id']}").status_code == 404
    assert client.post(f"/quotations/{quote['id']}/approve", json={}).status_code == 404
    assert client.post(f"/quotations/{quote['id']}/decline", json={}).status_code == 404


def test_role_guards(api):
    quote = create_draft(api)
    client, state, _, _ = api
    state["user"] = CLIENT_A
    assert client.post("/requests/1/quotations", json=quote_payload()).status_code == 403
    state["user"] = EMPLOYEE
    assert client.post("/requests/1/quotations", json=quote_payload()).status_code == 403
    state["user"] = ADMIN
    assert client.get(f"/quotations/{quote['id']}").status_code == 403


def test_provider_must_be_approved(api):
    client, state, _, _ = api
    state["user"] = Actor(204, "COMPANY_MANAGER", 4)
    response = client.post("/requests/1/quotations", json=quote_payload())
    assert response.status_code == 403


def test_provider_cannot_quote_cancelled_request(api):
    response = api[0].post("/requests/4/quotations", json=quote_payload())
    assert response.status_code == 409


def test_invalid_downpayment_rejected(api):
    response = api[0].post("/requests/1/quotations", json=quote_payload(downpayment_amount="20000.00"))
    assert response.status_code == 422


def test_invalid_line_item_rejected(api):
    response = api[0].post("/requests/1/quotations", json=quote_payload(items=[
        {"description": "Bad item", "quantity": 0, "unit_price": 100}
    ]))
    assert response.status_code == 422


def test_expired_sent_quote_cannot_be_approved(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    with api[2].begin() as db:
        db.execute(api[3]["quotes"].update().where(api[3]["quotes"].c.id == quote["id"])
                   .values(valid_until=datetime.now(timezone.utc) - timedelta(minutes=1)))
    client, state, factory, tables = api
    state["user"] = CLIENT_A
    response = client.post(f"/quotations/{quote['id']}/approve", json={})
    assert response.status_code == 409
    with factory() as db:
        status = db.execute(select(tables["quotes"].c.status).where(
            tables["quotes"].c.id == quote["id"]
        )).scalar_one()
        assert status == "EXPIRED"
        assert db.execute(select(tables["jobs"])).first() is None


def test_expired_quote_can_be_replaced(api):
    quote = create_draft(api)
    send_draft(api, quote["id"])
    with api[2].begin() as db:
        db.execute(api[3]["quotes"].update().where(api[3]["quotes"].c.id == quote["id"])
                   .values(valid_until=datetime.now(timezone.utc) - timedelta(minutes=1)))
    replacement = create_draft(api)
    assert replacement["id"] != quote["id"]


def test_only_draft_can_be_edited_and_send_requires_future_validity(api):
    quote = create_draft(api)
    response = api[0].patch(f"/quotations/{quote['id']}", json={
        "valid_until": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "status": "SENT",
    })
    assert response.status_code == 422


def test_empty_patch_rejected(api):
    quote = create_draft(api)
    response = api[0].patch(f"/quotations/{quote['id']}", json={})
    assert response.status_code == 422
