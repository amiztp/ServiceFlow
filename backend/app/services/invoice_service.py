from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import secrets
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.models.job import Job
from app.models.quotation import Quotation
from app.models.service_request import ServiceRequest
from app.models.payment import Payment


PROVIDER_ROLES = {"COMPANY_MANAGER", "INDIVIDUAL_PROVIDER"}
READ_ROLES = PROVIDER_ROLES | {"CLIENT"}
CENT = Decimal("0.01")


def _fail(code: int, detail: str):
    raise HTTPException(status_code=code, detail=detail)


def _scope_clause(user: Any):
    role = user.role
    if role == "CLIENT":
        return Invoice.job_id.in_(
            select(Job.id)
            .join(ServiceRequest, ServiceRequest.id == Job.request_id)
            .where(ServiceRequest.client_id == int(user.id))
        )
    if role in PROVIDER_ROLES:
        if user.provider_id is None:
            _fail(403, "Provider account is not linked to a provider")
        return Invoice.job_id.in_(
            select(Job.id).where(Job.provider_id == int(user.provider_id))
        )
    _fail(403, "Your role cannot access financial records")


def _get_invoice(db: Session, user: Any, invoice_id: int, *, lock: bool = False) -> Invoice:
    stmt = (
        select(Invoice)
        .join(Job, Job.id == Invoice.job_id)
        .where(Invoice.id == invoice_id, _scope_clause(user))
    )
    if lock:
        stmt = stmt.with_for_update(of=Invoice)
    invoice = db.execute(stmt).scalar_one_or_none()
    if invoice is None:
        _fail(404, "Invoice not found")
    return invoice


def _invoice_public(invoice: Invoice) -> dict:
    return {
        "id": invoice.id,
        "job_id": invoice.job_id,
        "invoice_number": invoice.invoice_number,
        "total_amount": invoice.total_amount,
        "downpayment_amount": invoice.downpayment_amount,
        "paid_amount": invoice.paid_amount,
        "payment_status": invoice.payment_status,
        "issued_at": invoice.issued_at,
        "paid_at": invoice.paid_at,
    }


def list_invoices(db: Session, user: Any, *, limit: int, offset: int) -> dict:
    scope = _scope_clause(user)
    base = select(Invoice).join(Job, Job.id == Invoice.job_id).where(scope)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(Invoice.issued_at.desc(), Invoice.id.desc())
        .limit(limit).offset(offset)
    ).scalars().all()
    return {
        "items": [_invoice_public(row) for row in rows],
        "total": total, "limit": limit, "offset": offset,
    }


def get_invoice(db: Session, user: Any, invoice_id: int) -> dict:
    return _invoice_public(_get_invoice(db, user, invoice_id))


def list_payments(db: Session, user: Any, invoice_id: int, *, limit: int, offset: int) -> dict:
    invoice = _get_invoice(db, user, invoice_id)
    base = select(Payment).where(Payment.invoice_id == invoice.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(Payment.received_at.desc(), Payment.id.desc())
        .limit(limit).offset(offset)
    ).scalars().all()
    return {
        "items": rows, "total": total, "limit": limit, "offset": offset,
    }


def record_payment(db: Session, user: Any, invoice_id: int, payload: dict) -> dict:
    if user.role not in PROVIDER_ROLES:
        _fail(403, "Only the owning provider manager or individual provider can record a payment")

    invoice = _get_invoice(db, user, invoice_id, lock=True)
    job = db.get(Job, invoice.job_id)
    if job is None or int(job.provider_id) != int(user.provider_id):
        _fail(404, "Invoice not found")
    if job.status != "COMPLETED":
        _fail(409, "Payments can only be recorded for a completed job")

    amount = Decimal(str(payload["amount"])).quantize(CENT, rounding=ROUND_HALF_UP)
    total = Decimal(invoice.total_amount).quantize(CENT)
    paid = Decimal(invoice.paid_amount).quantize(CENT)
    balance = total - paid
    if amount <= 0:
        _fail(422, "Payment amount must be greater than zero")
    if amount > balance:
        _fail(409, f"Payment exceeds the outstanding balance of {balance:.2f}")

    payment = Payment(
        invoice_id=invoice.id,
        received_by=int(user.id),
        amount=amount,
        method=payload["method"],
        reference=payload.get("reference"),
        note=payload.get("note"),
    )
    db.add(payment)

    new_paid = paid + amount
    invoice.paid_amount = new_paid
    if new_paid == total:
        invoice.payment_status = "PAID"
        invoice.paid_at = datetime.now(timezone.utc)
    elif new_paid > 0:
        invoice.payment_status = "PARTIALLY_PAID"
        invoice.paid_at = None
    else:
        invoice.payment_status = "UNPAID"
        invoice.paid_at = None

    try:
        db.flush()
        result = {
            "id": payment.id,
            "invoice_id": payment.invoice_id,
            "received_by": payment.received_by,
            "amount": payment.amount,
            "method": payment.method,
            "reference": payment.reference,
            "note": payment.note,
            "received_at": payment.received_at,
            "invoice": _invoice_public(invoice),
        }
        db.commit()
        return result
    except Exception:
        db.rollback()
        raise


def get_payment(db: Session, user: Any, payment_id: int) -> dict:
    stmt = (
        select(Payment)
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .join(Job, Job.id == Invoice.job_id)
        .where(Payment.id == payment_id, _scope_clause(user))
    )
    payment = db.execute(stmt).scalar_one_or_none()
    if payment is None:
        _fail(404, "Payment not found")
    return {
        "id": payment.id,
        "invoice_id": payment.invoice_id,
        "received_by": payment.received_by,
        "amount": payment.amount,
        "method": payment.method,
        "reference": payment.reference,
        "note": payment.note,
        "received_at": payment.received_at,
    }


def ensure_invoice_for_completed_job(db: Session, job_id: int) -> Invoice:
    """
    Called inside complete_job's transaction after the job status is set COMPLETED.
    Does not commit; caller owns the transaction.
    """
    job = db.execute(
        select(Job).where(Job.id == job_id).with_for_update()
    ).scalar_one_or_none()
    if job is None:
        _fail(404, "Job not found")
    if job.status != "COMPLETED":
        _fail(409, "Invoice can only be generated for a completed job")

    existing = db.execute(
        select(Invoice).where(Invoice.job_id == job_id).with_for_update()
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    quotation = db.get(Quotation, job.quotation_id)
    if quotation is None or quotation.status != "APPROVED":
        _fail(409, "An approved quotation is required to generate the invoice")

    total = Decimal(quotation.total_amount).quantize(CENT)
    downpayment = Decimal(quotation.downpayment_amount or 0).quantize(CENT)
    if total <= 0:
        _fail(409, "Cannot automatically generate an invoice with a zero total")
    if downpayment < 0 or downpayment > total:
        _fail(409, "Approved quotation has an invalid downpayment amount")

    invoice = Invoice(
        job_id=job_id,
        invoice_number=f"SF-INV-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(5).upper()}",
        total_amount=total,
        downpayment_amount=downpayment,
        paid_amount=Decimal("0.00"),
        payment_status="UNPAID",
    )
    db.add(invoice)
    db.flush()
    return invoice
