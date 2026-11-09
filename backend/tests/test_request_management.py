"""Run from backend/: pytest -q tests/test_request_management.py

SQLite integration tests exercise the request rules without touching Docker data.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, MetaData,
    String, Table, Text, Time, create_engine, insert, update, func,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import request_extensions, requests
from app.core.dependencies import get_current_user
from app.database import get_db


@dataclass
class Actor:
    id: int
    role: str
    provider_id: int | None = None


CLIENT = Actor(100, "CLIENT")
OTHER_CLIENT = Actor(101, "CLIENT")
PROVIDER = Actor(200, "INDIVIDUAL_PROVIDER", 1)
MANAGER = Actor(201, "COMPANY_MANAGER", 1)
OTHER_PROVIDER = Actor(202, "COMPANY_MANAGER", 2)
EMPLOYEE = Actor(203, "EMPLOYEE", 1)
ADMIN = Actor(204, "SYSTEM_ADMIN")


def tomorrow():
    return (date.today() + timedelta(days=1)).isoformat()


def valid_request(**changes):
    body = dict(provider_id=1, service_id=10, description="Kitchen tap is leaking badly",
                preferred_date=tomorrow(), preferred_time="10:30:00",
                address="12 Example Road, Colombo", latitude=6.9271, longitude=79.8612)
    body.update(changes)
    return body


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("SERVICEFLOW_UPLOAD_ROOT", str(tmp_path / "uploads"))
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    metadata = MetaData()
    def col_id():
        return Column("id", Integer, primary_key=True, autoincrement=True)
    def created():
        return Column("created_at", DateTime(timezone=True), nullable=False,
                      server_default=func.now())
    def updated():
        return Column("updated_at", DateTime(timezone=True), nullable=False,
                      server_default=func.now())

    providers = Table("providers", metadata,
                      col_id(), Column("verification_status", String(20), nullable=False),
                      Column("accepting_requests", Boolean, nullable=False))
    services = Table("services", metadata, col_id(), Column("is_active", Boolean, nullable=False))
    offers = Table("provider_services", metadata, col_id(),
                   Column("provider_id", Integer, ForeignKey("providers.id")),
                   Column("service_id", Integer, ForeignKey("services.id")),
                   Column("is_active", Boolean, nullable=False))
    reqs = Table("service_requests", metadata, col_id(),
                 Column("client_id", Integer, nullable=False),
                 Column("provider_id", Integer, ForeignKey("providers.id"), nullable=False),
                 Column("service_id", Integer, ForeignKey("services.id"), nullable=False),
                 Column("description", Text, nullable=False),
                 Column("preferred_date", Date, nullable=False),
                 Column("preferred_time", Time), Column("address", Text, nullable=False),
                 Column("latitude", Float, nullable=False), Column("longitude", Float, nullable=False),
                 Column("status", String(30), nullable=False),
                 Column("rejection_reason", Text), Column("cancellation_reason", Text),
                 Column("cancelled_by_user_id", Integer), Column("cancelled_at", DateTime(timezone=True)),
                 Column("rejected_at", DateTime(timezone=True)), created(), updated())
    messages = Table("request_messages", metadata, col_id(),
                     Column("request_id", Integer, ForeignKey("service_requests.id")),
                     Column("sender_user_id", Integer), Column("message_text", Text), created())
    attachments = Table("request_attachments", metadata, col_id(),
                        Column("request_id", Integer, ForeignKey("service_requests.id")),
                        Column("file_path", Text), Column("file_name", String(255)),
                        Column("content_type", String(100)), created())
    quotes = Table("quotations", metadata, col_id(),
                   Column("request_id", Integer, ForeignKey("service_requests.id")),
                   Column("status", String(20)))
    jobs = Table("jobs", metadata, col_id(),
                 Column("request_id", Integer, ForeignKey("service_requests.id")),
                 Column("status", String(30)))
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(insert(providers), [
            {"id": 1, "verification_status": "APPROVED", "accepting_requests": True},
            {"id": 2, "verification_status": "APPROVED", "accepting_requests": True},
            {"id": 3, "verification_status": "SUSPENDED", "accepting_requests": True},
            {"id": 4, "verification_status": "APPROVED", "accepting_requests": False},
        ])
        conn.execute(insert(services), [
            {"id": 10, "is_active": True}, {"id": 11, "is_active": False},
        ])
        conn.execute(insert(offers), [
            {"provider_id": 1, "service_id": 10, "is_active": True},
            {"provider_id": 2, "service_id": 10, "is_active": True},
            {"provider_id": 3, "service_id": 10, "is_active": True},
            {"provider_id": 4, "service_id": 10, "is_active": True},
            {"provider_id": 1, "service_id": 11, "is_active": True},
        ])
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    active = {"user": CLIENT}
    app = FastAPI()
    app.include_router(requests.router)
    app.include_router(request_extensions.router)

    def override_db():
        with factory() as db:
            yield db

    def override_user():
        return active["user"]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    with TestClient(app) as client:
        yield client, active, factory, {"requests": reqs, "quotations": quotes, "jobs": jobs,
                                       "providers": providers, "offers": offers}
    engine.dispose()


def create(api, **changes):
    client, active, _, _ = api
    active["user"] = CLIENT
    response = client.post("/requests", json=valid_request(**changes))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_create_and_detail(api):
    client, active, _, _ = api
    request_id = create(api)
    row = client.get(f"/requests/{request_id}")
    assert row.status_code == 200
    assert row.json()["client_id"] == CLIENT.id
    assert row.json()["status"] == "NEW"
    assert row.json()["attachments"] == []


def test_multiple_requests_allowed(api):
    a = create(api)
    b = create(api)
    assert a != b
    assert api[0].get("/requests").json()["total"] == 2


@pytest.mark.parametrize("actor", [PROVIDER, MANAGER, OTHER_PROVIDER, EMPLOYEE, ADMIN])
def test_non_clients_cannot_create(api, actor):
    client, active, _, _ = api
    active["user"] = actor
    assert client.post("/requests", json=valid_request()).status_code == 403


@pytest.mark.parametrize("change,code", [
    ({"provider_id": 999}, 404), ({"provider_id": 3}, 409),
    ({"provider_id": 4}, 409), ({"service_id": 11}, 422),
    ({"service_id": 999}, 422), ({"latitude": 100}, 422),
    ({"description": "     "}, 422),
])
def test_invalid_creation(api, change, code):
    assert api[0].post("/requests", json=valid_request(**change)).status_code == code


def test_past_date_rejected(api):
    response = api[0].post("/requests", json=valid_request(
        preferred_date=(date.today() - timedelta(days=1)).isoformat()))
    assert response.status_code == 422


def test_client_cannot_read_other_client_request(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = OTHER_CLIENT
    assert client.get(f"/requests/{request_id}").status_code == 404
    assert client.get("/requests").json()["total"] == 0
    assert client.get(f"/requests/{request_id}/messages").status_code == 404


def test_provider_scoping(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = PROVIDER
    assert client.get(f"/requests/{request_id}").status_code == 200
    assert client.get("/requests").json()["total"] == 1
    active["user"] = OTHER_PROVIDER
    assert client.get(f"/requests/{request_id}").status_code == 404
    assert client.get("/requests").json()["total"] == 0


def test_employee_and_admin_denied_request_detail(api):
    request_id = create(api)
    client, active, _, _ = api
    for actor in (EMPLOYEE, ADMIN):
        active["user"] = actor
        assert client.get(f"/requests/{request_id}").status_code == 403
        assert client.get("/requests").status_code == 403


def test_message_exchange_and_pagination(api):
    request_id = create(api)
    client, active, _, _ = api
    first = client.post(f"/requests/{request_id}/messages", json={"message_text": "Is morning available?"})
    assert first.status_code == 201
    assert first.json()["sender_user_id"] == CLIENT.id
    active["user"] = PROVIDER
    second = client.post(f"/requests/{request_id}/messages", json={"message_text": "We will confirm shortly."})
    assert second.status_code == 201
    messages = client.get(f"/requests/{request_id}/messages?limit=1&offset=1").json()
    assert messages["total"] == 2
    assert len(messages["items"]) == 1
    assert messages["items"][0]["sender_user_id"] == PROVIDER.id


def test_employee_cannot_message(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = EMPLOYEE
    assert client.post(f"/requests/{request_id}/messages", json={"message_text": "No"}).status_code == 403


def test_reject_request_and_prevent_messages(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = PROVIDER
    response = client.post(f"/requests/{request_id}/reject", json={"reason": "Outside our service area"})
    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"
    assert response.json()["rejection_reason"] == "Outside our service area"
    assert client.post(f"/requests/{request_id}/messages", json={"message_text": "Hello"}).status_code == 409
    assert client.post(f"/requests/{request_id}/reject", json={"reason": "Again"}).status_code == 409


def test_client_cannot_reject(api):
    request_id = create(api)
    assert api[0].post(f"/requests/{request_id}/reject", json={"reason": "Not now"}).status_code == 403


def test_cancel_and_prevent_messages(api):
    request_id = create(api)
    client = api[0]
    response = client.post(f"/requests/{request_id}/cancel", json={"reason": "Plans changed"})
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"
    assert response.json()["cancellation_reason"] == "Plans changed"
    assert client.post(f"/requests/{request_id}/cancel", json={}).status_code == 409
    assert client.post(f"/requests/{request_id}/messages", json={"message_text": "Hello"}).status_code == 409


def test_provider_cannot_cancel(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = PROVIDER
    assert client.post(f"/requests/{request_id}/cancel", json={}).status_code == 403


def test_cancel_blocked_after_approved_quote(api):
    request_id = create(api)
    client, active, factory, t = api
    with factory.begin() as db:
        db.execute(insert(t["quotations"]).values(request_id=request_id, status="APPROVED"))
    assert client.post(f"/requests/{request_id}/cancel", json={}).status_code == 409


def test_cancel_blocked_after_job(api):
    request_id = create(api)
    client, active, factory, t = api
    with factory.begin() as db:
        db.execute(insert(t["jobs"]).values(request_id=request_id, status="JOB_CREATED"))
    assert client.post(f"/requests/{request_id}/cancel", json={}).status_code == 409


def test_reject_blocked_after_sent_quote(api):
    request_id = create(api)
    client, active, factory, t = api
    with factory.begin() as db:
        db.execute(insert(t["quotations"]).values(request_id=request_id, status="SENT"))
    active["user"] = PROVIDER
    assert client.post(f"/requests/{request_id}/reject", json={"reason": "Sorry"}).status_code == 409


def test_review_and_request_information(api):
    request_id = create(api)
    client, active, _, _ = api
    active["user"] = MANAGER
    assert client.post(f"/requests/{request_id}/review").json()["status"] == "UNDER_REVIEW"
    response = client.post(f"/requests/{request_id}/request-information",
                           json={"message_text": "Please send a photo of the leak"})
    assert response.status_code == 200
    assert response.json()["status"] == "NEED_INFORMATION"
    active["user"] = CLIENT
    response = client.post(f"/requests/{request_id}/messages", json={"message_text": "Sure, attached."})
    assert response.status_code == 201
    assert client.get(f"/requests/{request_id}").json()["status"] == "UNDER_REVIEW"


def test_status_filter_and_limit(api):
    a = create(api)
    create(api)
    client = api[0]
    assert client.post(f"/requests/{a}/cancel", json={}).status_code == 200
    result = client.get("/requests?status=NEW&limit=1").json()
    assert result["total"] == 1
    assert result["items"][0]["status"] == "NEW"
    assert client.get("/requests?status=WRONG").status_code == 422
    assert client.get("/requests?limit=101").status_code == 422


def test_photo_upload_list_and_authorized_download(api):
    request_id = create(api)
    client, active, _, _ = api
    tiny_png = b"\x89PNG\r\n\x1a\n" + b"some-image-data"
    response = client.post(f"/requests/{request_id}/attachments",
                           files={"file": ("leak.png", tiny_png, "image/png")})
    assert response.status_code == 201, response.text
    photo_id = response.json()["id"]
    assert "file_path" not in response.json()
    assert len(client.get(f"/requests/{request_id}/attachments").json()) == 1
    download = client.get(f"/requests/{request_id}/attachments/{photo_id}")
    assert download.status_code == 200
    assert download.content == tiny_png
    active["user"] = OTHER_CLIENT
    assert client.get(f"/requests/{request_id}/attachments/{photo_id}").status_code == 404
    active["user"] = PROVIDER
    assert client.get(f"/requests/{request_id}/attachments/{photo_id}").status_code == 200


def test_photo_type_and_size_rejected(api):
    request_id = create(api)
    client = api[0]
    assert client.post(f"/requests/{request_id}/attachments",
                       files={"file": ("x.txt", b"hello", "text/plain")}).status_code == 415
    assert client.post(f"/requests/{request_id}/attachments",
                       files={"file": ("x.png", b"wrong", "image/png")}).status_code == 415
    assert client.post(f"/requests/{request_id}/attachments",
                       files={"file": ("x.png", b"\x89PNG\r\n\x1a\n" + b"x" * (5 * 1024 * 1024),
                                       "image/png")}).status_code == 413


def test_photo_upload_blocked_after_cancel(api):
    request_id = create(api)
    client = api[0]
    client.post(f"/requests/{request_id}/cancel", json={})
    assert client.post(f"/requests/{request_id}/attachments",
                       files={"file": ("x.png", b"\x89PNG\r\n\x1a\nhello", "image/png")}).status_code == 409


def test_suspended_provider_cannot_write(api):
    request_id = create(api)
    client, active, factory, t = api
    with factory.begin() as db:
        db.execute(update(t["providers"]).where(t["providers"].c.id == 1)
                   .values(verification_status="SUSPENDED"))
    active["user"] = PROVIDER
    assert client.get(f"/requests/{request_id}").status_code == 200
    assert client.post(f"/requests/{request_id}/messages",
                       json={"message_text": "Hello"}).status_code == 403
    assert client.post(f"/requests/{request_id}/reject", json={"reason": "Not now"}).status_code == 403
