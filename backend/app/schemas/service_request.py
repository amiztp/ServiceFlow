"""Pydantic v2 contracts for ServiceFlow requests and conversations."""
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


RequestStatus = Literal[
    "NEW", "UNDER_REVIEW", "NEED_INFORMATION", "QUOTATION_SENT", "REJECTED", "CANCELLED"
]


def _nonblank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Must not be empty or whitespace")
    return value


class RequestCreate(BaseModel):
    provider_id: int = Field(gt=0)
    service_id: int = Field(gt=0)
    description: str = Field(min_length=10, max_length=5000)
    preferred_date: date
    preferred_time: time | None = None
    address: str = Field(min_length=3, max_length=1000)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)

    @field_validator("description", "address")
    @classmethod
    def strip_required_text(cls, value: str, info) -> str:
        value = _nonblank(value)
        minimum = 10 if info.field_name == "description" else 3
        if len(value) < minimum:
            raise ValueError(f"Must contain at least {minimum} non-whitespace characters")
        return value


class RequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    provider_id: int
    service_id: int
    description: str
    preferred_date: date
    preferred_time: time | None
    address: str
    latitude: float
    longitude: float
    status: RequestStatus
    rejection_reason: str | None = None
    cancellation_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class RequestAttachmentRead(BaseModel):
    id: int
    request_id: int
    file_name: str
    content_type: str
    created_at: datetime


class RequestDetail(RequestRead):
    attachments: list[RequestAttachmentRead] = Field(default_factory=list)


class RequestListResponse(BaseModel):
    items: list[RequestRead]
    total: int = Field(ge=0)
    limit: int
    offset: int


class RequestMessageCreate(BaseModel):
    message_text: str = Field(min_length=1, max_length=4000)

    @field_validator("message_text")
    @classmethod
    def strip_message(cls, value: str) -> str:
        return _nonblank(value)


class RequestMessageRead(BaseModel):
    id: int
    request_id: int
    sender_user_id: int
    message_text: str
    created_at: datetime


class RequestMessageList(BaseModel):
    items: list[RequestMessageRead]
    total: int
    limit: int
    offset: int


class RequestCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)

    @field_validator("reason")
    @classmethod
    def strip_optional_reason(cls, value: str | None) -> str | None:
        return _nonblank(value) if value is not None else None


class RequestReject(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        value = _nonblank(value)
        if len(value) < 3:
            raise ValueError("Reason must contain at least 3 characters")
        return value


class RequestInformation(BaseModel):
    message_text: str = Field(min_length=1, max_length=4000)

    @field_validator("message_text")
    @classmethod
    def strip_message(cls, value: str) -> str:
        return _nonblank(value)
