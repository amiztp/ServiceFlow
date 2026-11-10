from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.invoice import InvoiceList, InvoiceRead
from app.schemas.payment import PaymentCreate, PaymentList, PaymentRead
from app.services import invoice_service as service

router = APIRouter(tags=["Invoices & Payments"])


@router.get("/invoices", response_model=InvoiceList)
def list_invoices(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_invoices(db, current_user, limit=limit, offset=offset)


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_invoice(db, current_user, invoice_id)


@router.get("/invoices/{invoice_id}/payments", response_model=PaymentList)
def list_invoice_payments(
    invoice_id: int,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_payments(db, current_user, invoice_id, limit=limit, offset=offset)


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentRead,
    status_code=201,
)
def create_invoice_payment(
    invoice_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = service.record_payment(db, current_user, invoice_id, payload.model_dump())
    return {k: v for k, v in result.items() if k != "invoice"}


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = service.get_invoice(db, current_user, invoice_id)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 30 * mm
    pdf.setTitle(f"Invoice {invoice['invoice_number']}")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(25 * mm, y, "ServiceFlow Invoice")
    y -= 18 * mm
    pdf.setFont("Helvetica", 11)
    lines = [
        f"Invoice number: {invoice['invoice_number']}",
        f"Invoice ID: {invoice['id']}",
        f"Job ID: {invoice['job_id']}",
        f"Issued: {invoice['issued_at'].isoformat()}",
        f"Total: {invoice['total_amount']:.2f}",
        f"Downpayment: {invoice['downpayment_amount']:.2f}",
        f"Paid: {invoice['paid_amount']:.2f}",
        f"Balance: {invoice['total_amount'] - invoice['paid_amount']:.2f}",
        f"Payment status: {invoice['payment_status']}",
    ]
    for line in lines:
        pdf.drawString(25 * mm, y, line)
        y -= 9 * mm
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice["invoice_number"]}.pdf"',
            "X-Content-Type-Options": "nosniff",
        },
    )
