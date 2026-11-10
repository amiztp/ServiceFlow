from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PaymentMethod = Literal["CASH", "BANK_TRANSFER", "CARD_EXTERNAL", "OTHER"]


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    method: PaymentMethod
    reference: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=2000)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    received_by: int
    amount: Decimal
    method: str
    reference: str | None
    note: str | None
    received_at: datetime


class PaymentList(BaseModel):
    items: list[PaymentRead]
    total: int
    limit: int
    offset: int
