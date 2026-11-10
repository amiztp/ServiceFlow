"""Pydantic v2 contracts for ServiceFlow quotation management."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator


QuotationStatus = Literal["DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"]


class QuotationItemInput(BaseModel):
    description: str = Field(min_length=2, max_length=500)
    quantity: Decimal = Field(gt=0, max_digits=10, decimal_places=3)
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Description must contain at least 2 non-whitespace characters")
        return value


class QuotationCreate(BaseModel):
    """Create a persisted draft. Send it by PATCH with status='SENT'."""
    items: list[QuotationItemInput] = Field(min_length=1, max_length=100)
    valid_until: AwareDatetime
    downpayment_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("valid_until")
    @classmethod
    def future_validity(cls, value: datetime) -> datetime:
        if value <= datetime.now(timezone.utc):
            raise ValueError("valid_until must be in the future")
        return value

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class QuotationUpdate(BaseModel):
    """Only a DRAFT may be patched. status='SENT' is the send transition.

    The frozen API list has no separate /send endpoint, so this uses the
    existing PATCH endpoint to move a draft to SENT after the final edit.
    """
    items: list[QuotationItemInput] | None = Field(default=None, min_length=1, max_length=100)
    valid_until: AwareDatetime | None = None
    downpayment_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    note: str | None = Field(default=None, max_length=2000)
    status: Literal["SENT"] | None = None

    @field_validator("valid_until")
    @classmethod
    def future_validity(cls, value: datetime | None) -> datetime | None:
        if value is not None and value <= datetime.now(timezone.utc):
            raise ValueError("valid_until must be in the future")
        return value

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def require_changes(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        return self


class QuotationDecision(BaseModel):
    """The MVP has no counter-offer workflow; decisions have no payload."""
    model_config = ConfigDict(extra="forbid")


class QuotationItemRead(BaseModel):
    id: int
    quotation_id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


class QuotationRead(BaseModel):
    id: int
    request_id: int
    status: QuotationStatus
    subtotal: Decimal
    total_amount: Decimal
    valid_until: datetime
    downpayment_amount: Decimal | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[QuotationItemRead]
    job_id: int | None = None
