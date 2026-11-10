from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    invoice_number: str
    total_amount: Decimal
    downpayment_amount: Decimal
    paid_amount: Decimal
    payment_status: str
    issued_at: datetime
    paid_at: datetime | None


class InvoiceList(BaseModel):
    items: list[InvoiceRead]
    total: int
    limit: int
    offset: int
