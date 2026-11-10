"""Job lifecycle and availability rules for ServiceFlow.

Uses SQLAlchemy Core reflection against the existing PostgreSQL tables. This
avoids replacing existing ORM models and does not create or modify tables.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from functools import lru_cache
from typing import Any

from sqlalchemy import MetaData, Table, and_, func, insert, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.services.invoice_service import ensure_invoice_for_completed_job


TABLES = (
    "jobs", "job_records", "users", "providers", "service_requests",
    "quotations", "services", "provider_services", "user_skills",
    "working_hours", "invoices",
)
PROVIDER_ROLES = {"INDIVIDUAL_PROVIDER", "COMPANY_MANAGER"}
WORKER_ROLES = {"INDIVIDUAL_PROVIDER", "EMPLOYEE"}
ACTIVE_JOB_STATUSES = {"JOB_CREATED", "SCHEDULE_PROPOSED", "SCHEDULE_CONFIRMED", "IN_PROGRESS"}
TERMINAL_JOB_STATUSES = {"COMPLETED", "CANCELLED"}


class JobServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def fail(code: int, detail: str) -> None:
    raise JobServiceError(code, detail)


@lru_cache(maxsize=16)
def _reflect(engine: Any) -> dict[str, Table]:
    metadata = MetaData()
    return {name: Table(name, metadata, autoload_with=engine) for name in TABLES}


def tables(db: Session) -> dict[str, Table]:
    try:
        return _reflect(db.get_bind())
    except Exception as exc:
        raise JobServiceError(500, f"Required job database table could not be reflected: {exc}") from exc


def role(user: Any) -> str:
    return str(getattr(user, "role", ""))


def provider_id(user: Any) -> int:
    value = getattr(user, "provider_id", None)
    if value is None:
        fail(403, "Your account is not linked to a provider")
    return int(value)


def _scope(db: Session, jobs: Table, user: Any):
    requests = tables(db)["service_requests"]
    r = role(user)
    if r == "CLIENT":
        return jobs.c.request_id.in_(
            select(requests.c.id).where(requests.c.client_id == int(user.id))
        )
    if r in PROVIDER_ROLES:
        return jobs.c.provider_id == provider_id(user)
    if r == "EMPLOYEE":
        return jobs.c.assigned_user_id == int(user.id)
    fail(403, "Your role cannot access operational jobs")


def _require_provider(user: Any) -> None:
    if role(user) not in PROVIDER_ROLES:
        fail(403, "Only an individual provider or company manager can perform this action")
    provider_id(user)


def _require_worker(user: Any) -> None:
    if role(user) not in WORKER_ROLES | {"EMPLOYEE"}:
        fail(403, "Only the assigned worker can perform this action")


def _get_job(db: Session, user: Any, job_id: int, *, lock: bool = False) -> dict:
    t = tables(db)
    jobs = t["jobs"]
    stmt = select(jobs).where(jobs.c.id == job_id, _scope(db, jobs, user))
    if lock:
        stmt = stmt.with_for_update()
    row = db.execute(stmt).mappings().first()
    if row is None:
        fail(404, "Job not found")
    return dict(row)


def _provider_is_approved(db: Session, pid: int) -> dict:
    providers = tables(db)["providers"]
    row = db.execute(select(providers).where(providers.c.id == pid)).mappings().first()
    if row is None:
        fail(404, "Provider not found")
    if row["verification_status"] != "APPROVED":
        fail(403, "Provider is not approved for job operations")
    return dict(row)


def _assert_provider_owns_job(user: Any, job: dict) -> None:
    if role(user) not in PROVIDER_ROLES or int(job["provider_id"]) != provider_id(user):
        fail(404, "Job not found")


def _append_status_record(db: Session, job_id: int, note: str) -> None:
    records = tables(db)["job_records"]
    db.execute(insert(records).values(job_id=job_id, record_type="STATUS", note=note))


def _get_service_context(db: Session, job: dict) -> tuple[dict, dict]:
    t = tables(db)
    req = db.execute(select(t["service_requests"]).where(
        t["service_requests"].c.id == job["request_id"]
    )).mappings().first()
    if req is None:
        fail(409, "The job's service request no longer exists")
    service = db.execute(select(t["services"]).where(
        t["services"].c.id == req["service_id"]
    )).mappings().first()
    if service is None:
        fail(409, "The job's service no longer exists")
    return dict(req), dict(service)


def _working_hours_check(db: Session, pid: int, scheduled_date: date, scheduled_time: time) -> None:
    hours = tables(db)["working_hours"]
    # Proposal stores weekly provider hours. Day values are expected to be
    # MONDAY..SUNDAY or 0..6; support both common persisted representations.
    day_name = scheduled_date.strftime("%A").upper()
    day_number = scheduled_date.weekday()
    rows = db.execute(select(hours).where(hours.c.provider_id == pid)).mappings().all()
    if not rows:
        fail(409, "Provider working hours are not configured")
    matching = []
    for row in rows:
        day = str(row["day_of_week"]).upper()
        if day in {day_name, str(day_number), str(day_number + 1)}:
            matching.append(dict(row))
    if not matching:
        fail(409, "Provider has no working-hours entry for this day")
    if all(bool(row["is_closed"]) for row in matching):
        fail(409, "Provider is closed on the proposed date")
    for row in matching:
        if row["is_closed"]:
            continue
        start = row["start_time"]
        end = row["end_time"]
        if start is not None and end is not None and start <= scheduled_time < end:
            return
    fail(409, "Proposed time is outside provider working hours")


def _required_skill_check(db: Session, worker_id: int, service: dict) -> None:
    skills = tables(db)["user_skills"]
    # The finalized proposal distinguishes global Services from per-user Skills.
    # In the absence of a separate service-to-required-skill mapping table, the
    # agreed MVP check is a case-insensitive match against the service name.
    wanted = str(service["name"]).strip().casefold()
    rows = db.execute(select(skills.c.skill_name).where(
        skills.c.user_id == worker_id
    )).scalars().all()
    if not any(str(item).strip().casefold() == wanted for item in rows):
        fail(409, f"Assigned worker does not have the required skill: {service['name']}")


def _check_worker_availability(db: Session, job: dict, worker_id: int,
                               scheduled_date: date, scheduled_time: time) -> None:
    t = tables(db)
    users = t["users"]
    worker = db.execute(select(users).where(users.c.id == worker_id)).mappings().first()
    if worker is None or worker["status"] != "ACTIVE":
        fail(409, "Assigned worker must be an ACTIVE user")
    if int(worker["provider_id"]) != int(job["provider_id"]):
        fail(404, "Employee does not belong to this provider")
    if worker["role"] not in WORKER_ROLES:
        fail(409, "Only an individual provider or employee can be assigned")
    request, service = _get_service_context(db, job)

    # Skills validation is required for company employees.
    # Individual providers are validated through provider ownership
    # and do not need an employee skill record.
    if worker["role"] == "EMPLOYEE":
        _required_skill_check(db, worker_id, service)

    _working_hours_check(
        db,
        int(job["provider_id"]),
        scheduled_date,
        scheduled_time,
    )

    jobs = t["jobs"]
    conflict = db.execute(select(jobs.c.id).where(
        jobs.c.assigned_user_id == worker_id,
        jobs.c.schedule_date == scheduled_date,
        jobs.c.schedule_time == scheduled_time,
        jobs.c.id != int(job["id"]),
        jobs.c.status.not_in(["COMPLETED", "CANCELLED"]),
    ).limit(1)).first()
    if conflict:
        fail(409, "Assigned worker already has a job at this exact date and time")


def list_jobs(db: Session, user: Any, *, status: str | None, schedule_status: str | None,
              limit: int, offset: int) -> dict:
    jobs = tables(db)["jobs"]
    filters = [_scope(db, jobs, user)]
    if status:
        if status not in {"JOB_CREATED", "SCHEDULE_PROPOSED", "SCHEDULE_CONFIRMED",
                          "IN_PROGRESS", "COMPLETED", "CANCELLED"}:
            fail(422, "Invalid job status")
        filters.append(jobs.c.status == status)
    if schedule_status:
        if schedule_status not in {"NOT_PROPOSED", "PENDING", "CONFIRMED"}:
            fail(422, "Invalid schedule status")
        filters.append(jobs.c.schedule_status == schedule_status)
    total = db.scalar(select(func.count()).select_from(jobs).where(*filters)) or 0
    rows = db.execute(select(jobs).where(*filters).order_by(
        jobs.c.created_at.desc(), jobs.c.id.desc()
    ).limit(limit).offset(offset)).mappings().all()
    return {"items": [dict(row) for row in rows], "total": total,
            "limit": limit, "offset": offset}


def get_job(db: Session, user: Any, job_id: int) -> dict:
    job = _get_job(db, user, job_id)
    records = tables(db)["job_records"]
    rows = db.execute(select(records).where(
        records.c.job_id == job_id
    ).order_by(records.c.created_at, records.c.id)).mappings().all()
    job["records"] = [_record_public(dict(row)) for row in rows]
    return job


def assign_employee(db: Session, user: Any, job_id: int, employee_id: int) -> dict:
    _require_provider(user)
    job = _get_job(db, user, job_id, lock=True)
    _assert_provider_owns_job(user, job)
    provider = _provider_is_approved(db, int(job["provider_id"]))
    if provider["type"] != "COMPANY":
        fail(409, "Employee assignment is available only for company jobs")
    if job["status"] in TERMINAL_JOB_STATUSES or job["status"] == "IN_PROGRESS":
        fail(409, "Cannot assign or reassign a worker after job execution starts")
    users = tables(db)["users"]
    employee = db.execute(select(users).where(
        users.c.id == employee_id
    )).mappings().first()
    if employee is None or employee["provider_id"] != job["provider_id"] or employee["role"] != "EMPLOYEE":
        fail(404, "Employee not found in your company")
    if employee["status"] != "ACTIVE":
        fail(409, "Employee must be ACTIVE")
    # Reassignment is allowed before/during work per FR-J06; however, schedule
    # must be re-proposed if a confirmed job's worker changes.
    jobs = tables(db)["jobs"]
    values = {"assigned_user_id": employee_id, "updated_at": datetime.now(timezone.utc)}
    if job["schedule_date"] is not None and job["schedule_time"] is not None:
        _check_worker_availability(db, job, employee_id, job["schedule_date"], job["schedule_time"])
        values.update(schedule_status="PENDING", status="SCHEDULE_PROPOSED")
    db.execute(update(jobs).where(jobs.c.id == job_id).values(**values))
    _append_status_record(db, job_id, f"Assigned to employee user_id={employee_id}")
    db.commit()
    return _get_job(db, user, job_id)


def propose_schedule(db: Session, user: Any, job_id: int, scheduled_date: date,
                     scheduled_time: time) -> dict:
    _require_provider(user)
    job = _get_job(db, user, job_id, lock=True)
    _assert_provider_owns_job(user, job)
    _provider_is_approved(db, int(job["provider_id"]))
    if job["status"] in TERMINAL_JOB_STATUSES or job["status"] == "IN_PROGRESS":
        fail(409, "Cannot schedule a completed, cancelled or in-progress job")
    if scheduled_date < date.today() or (scheduled_date == date.today() and scheduled_time <= datetime.now().time()):
        fail(422, "Schedule must be in the future")
    provider = tables(db)["providers"]
    p = db.execute(select(provider.c.type).where(provider.c.id == job["provider_id"])).scalar_one()
    worker_id = job["assigned_user_id"]
    if p == "COMPANY" and worker_id is None:
        fail(409, "Company manager must assign an employee before proposing a schedule")
    if p == "INDIVIDUAL":
        # Individual provider user account is the one linked to provider_id.
        users = tables(db)["users"]
        individual = db.execute(select(users.c.id).where(
            users.c.provider_id == job["provider_id"],
            users.c.role == "INDIVIDUAL_PROVIDER",
            users.c.status == "ACTIVE",
        )).scalar_one_or_none()
        if individual is None:
            fail(409, "Active individual provider account was not found")
        worker_id = int(individual)
    _check_worker_availability(db, job, int(worker_id), scheduled_date, scheduled_time)
    jobs = tables(db)["jobs"]
    db.execute(update(jobs).where(jobs.c.id == job_id).values(
        assigned_user_id=worker_id,
        schedule_date=scheduled_date,
        schedule_time=scheduled_time,
        schedule_status="PENDING",
        status="SCHEDULE_PROPOSED",
        updated_at=datetime.now(timezone.utc),
    ))
    _append_status_record(db, job_id, f"Schedule proposed for {scheduled_date.isoformat()} {scheduled_time.isoformat()}")
    db.commit()
    return _get_job(db, user, job_id)


def approve_schedule(db: Session, user: Any, job_id: int) -> dict:
    if role(user) != "CLIENT":
        fail(403, "Only the client who owns the job can approve its schedule")
    job = _get_job(db, user, job_id, lock=True)
    if job["status"] != "SCHEDULE_PROPOSED" or job["schedule_status"] != "PENDING":
        fail(409, "There is no pending schedule proposal to approve")
    if job["schedule_date"] is None or job["schedule_time"] is None:
        fail(409, "Schedule proposal is incomplete")
    # Recheck availability at approval time; the worker may have become busy
    # after the proposal was made.
    _check_worker_availability(db, job, int(job["assigned_user_id"]),
                               job["schedule_date"], job["schedule_time"])
    jobs = tables(db)["jobs"]
    db.execute(update(jobs).where(jobs.c.id == job_id).values(
        schedule_status="CONFIRMED",
        status="SCHEDULE_CONFIRMED",
        updated_at=datetime.now(timezone.utc),
    ))
    _append_status_record(db, job_id, "Client approved the proposed schedule")
    db.commit()
    return _get_job(db, user, job_id)


def start_job(db: Session, user: Any, job_id: int) -> dict:
    _require_worker(user)
    job = _get_job(db, user, job_id, lock=True)
    if job["assigned_user_id"] is None or int(job["assigned_user_id"]) != int(user.id):
        fail(404, "Job not found")
    if job["status"] != "SCHEDULE_CONFIRMED" or job["schedule_status"] != "CONFIRMED":
        fail(409, "Job can start only after the client confirms its schedule")
    users = tables(db)["users"]
    active = db.execute(select(users.c.status).where(users.c.id == int(user.id))).scalar_one_or_none()
    if active != "ACTIVE":
        fail(403, "Worker account is not active")
    jobs = tables(db)["jobs"]
    db.execute(update(jobs).where(jobs.c.id == job_id).values(
        status="IN_PROGRESS", updated_at=datetime.now(timezone.utc)
    ))
    _append_status_record(db, job_id, "Job started")
    db.commit()
    return _get_job(db, user, job_id)


def complete_job(db: Session, user: Any, job_id: int) -> dict:
    _require_worker(user)
    job = _get_job(db, user, job_id, lock=True)
    if job["assigned_user_id"] is None or int(job["assigned_user_id"]) != int(user.id):
        fail(404, "Job not found")
    if job["status"] != "IN_PROGRESS":
        fail(409, "Only an in-progress job can be completed")
    jobs = tables(db)["jobs"]
    now = datetime.now(timezone.utc)
    db.execute(update(jobs).where(jobs.c.id == job_id).values(
        status="COMPLETED", completed_at=now, updated_at=now
    ))
    _append_status_record(db, job_id, "Job completed")
    ensure_invoice_for_completed_job(db, job_id)
    db.commit()
    return _get_job(db, user, job_id)


def cancel_job(db: Session, user: Any, job_id: int, reason: str) -> dict:
    job = _get_job(db, user, job_id, lock=True)
    r = role(user)
    if r == "CLIENT":
        # Client can cancel own job before completion, including during work.
        pass
    elif r in PROVIDER_ROLES:
        _assert_provider_owns_job(user, job)
        _provider_is_approved(db, int(job["provider_id"]))
    else:
        fail(403, "Only the owning client or provider manager can cancel a job")
    if job["status"] in TERMINAL_JOB_STATUSES:
        fail(409, "Completed or cancelled jobs cannot be cancelled")
    jobs = tables(db)["jobs"]
    now = datetime.now(timezone.utc)
    db.execute(update(jobs).where(jobs.c.id == job_id).values(
        status="CANCELLED",
        cancellation_reason=reason,
        cancelled_at=now,
        cancelled_by=int(user.id),
        updated_at=now,
    ))
    _append_status_record(db, job_id, f"Job cancelled: {reason}")
    db.commit()
    return _get_job(db, user, job_id)


def _record_public(row: dict) -> dict:
    # Never expose internal file paths.
    row.pop("file_path", None)
    return row


def list_records(db: Session, user: Any, job_id: int, *, limit: int, offset: int) -> dict:
    _get_job(db, user, job_id)
    records = tables(db)["job_records"]
    total = db.scalar(select(func.count()).select_from(records).where(
        records.c.job_id == job_id
    )) or 0
    rows = db.execute(select(records).where(records.c.job_id == job_id).order_by(
        records.c.created_at, records.c.id
    ).limit(limit).offset(offset)).mappings().all()
    return {"items": [_record_public(dict(row)) for row in rows],
            "total": total, "limit": limit, "offset": offset}


def create_record(db: Session, user: Any, job_id: int, payload: dict) -> dict:
    job = _get_job(db, user, job_id, lock=True)
    if role(user) == "CLIENT":
        fail(403, "Clients cannot add operational job records")
    if role(user) in PROVIDER_ROLES:
        _assert_provider_owns_job(user, job)
    elif role(user) == "EMPLOYEE":
        if job["assigned_user_id"] != int(user.id):
            fail(404, "Job not found")
    else:
        fail(403, "Your role cannot add job records")
    if job["status"] in TERMINAL_JOB_STATUSES:
        fail(409, "Cannot add operational records to a completed or cancelled job")
    record_type = payload["record_type"]
    if record_type == "MATERIAL":
        if not payload.get("material_name") or payload.get("quantity") is None or not payload.get("unit"):
            fail(422, "MATERIAL records require material_name, quantity and unit")
        if Decimal(payload["quantity"]) <= 0:
            fail(422, "Material quantity must be positive")
    elif record_type in {"NOTE", "STATUS"}:
        if not payload.get("note"):
            fail(422, f"{record_type} records require a non-empty note")
    else:
        fail(422, "Use the photo upload extension for PHOTO records")
    records = tables(db)["job_records"]
    record_id = db.execute(insert(records).values(job_id=job_id, **payload).returning(records.c.id)).scalar_one()
    db.commit()
    row = db.execute(select(records).where(records.c.id == record_id)).mappings().one()
    return _record_public(dict(row))


def upload_photo_record(db: Session, user: Any, job_id: int, *, file_path: str,
                        file_name: str, content_type: str) -> dict:
    job = _get_job(db, user, job_id, lock=True)
    if role(user) in PROVIDER_ROLES:
        _assert_provider_owns_job(user, job)
    elif role(user) == "EMPLOYEE":
        if job["assigned_user_id"] != int(user.id):
            fail(404, "Job not found")
    else:
        fail(403, "Only the owning provider or assigned employee can add job photos")
    if job["status"] in TERMINAL_JOB_STATUSES:
        fail(409, "Cannot add photos to a completed or cancelled job")
    if not content_type.startswith("image/"):
        fail(415, "Only image files are supported")
    records = tables(db)["job_records"]
    record_id = db.execute(insert(records).values(
        job_id=job_id, record_type="PHOTO", file_path=file_path,
        file_name=file_name, content_type=content_type,
    ).returning(records.c.id)).scalar_one()
    db.commit()
    return _record_public(dict(db.execute(select(records).where(
        records.c.id == record_id
    )).mappings().one()))


def get_photo_record(db: Session, user: Any, job_id: int, record_id: int) -> dict:
    _get_job(db, user, job_id)
    records = tables(db)["job_records"]
    row = db.execute(select(records).where(
        records.c.id == record_id,
        records.c.job_id == job_id,
        records.c.record_type == "PHOTO",
    )).mappings().first()
    if row is None:
        fail(404, "Job photo not found")
    return dict(row)
