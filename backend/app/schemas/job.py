from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

JobStatus = Literal[
    "JOB_CREATED", "SCHEDULE_PROPOSED", "SCHEDULE_CONFIRMED",
    "IN_PROGRESS", "COMPLETED", "CANCELLED"
]
ScheduleStatus = Literal["NOT_PROPOSED", "PENDING", "CONFIRMED"]
RecordType = Literal["STATUS", "NOTE", "MATERIAL"]


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    request_id: int
    quotation_id: int
    provider_id: int
    assigned_user_id: int | None
    schedule_date: date | None
    schedule_time: time | None
    schedule_status: ScheduleStatus
    status: JobStatus
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    cancelled_by: int | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class JobDetail(JobRead):
    records: list["JobRecordRead"] = Field(default_factory=list)


class JobListResponse(BaseModel):
    items: list[JobRead]
    total: int
    limit: int
    offset: int


class JobAssign(BaseModel):
    employee_id: int = Field(gt=0)


class JobSchedule(BaseModel):
    schedule_date: date
    schedule_time: time

    @field_validator("schedule_date")
    @classmethod
    def date_not_in_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Schedule date cannot be in the past")
        return value


class JobCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Cancellation reason must contain at least 3 non-whitespace characters")
        return value


class JobRecordCreate(BaseModel):
    record_type: Literal["STATUS", "NOTE", "MATERIAL"]
    note: str | None = Field(default=None, max_length=4000)
    material_name: str | None = Field(default=None, max_length=150)
    quantity: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=3)
    unit: str | None = Field(default=None, max_length=30)

    @field_validator("note", "material_name", "unit")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class JobRecordRead(BaseModel):
    id: int
    job_id: int
    record_type: str
    note: str | None
    material_name: str | None
    quantity: Decimal | None
    unit: str | None
    file_name: str | None
    content_type: str | None
    created_at: datetime


class JobRecordList(BaseModel):
    items: list[JobRecordRead]
    total: int
    limit: int
    offset: int


JobDetail.model_rebuild()
