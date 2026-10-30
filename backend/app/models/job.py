from datetime import date, datetime, time

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Job(Base):
    __tablename__ = "jobs"

    __table_args__ = (
        CheckConstraint(
            "status IN ('JOB_CREATED', 'SCHEDULE_PROPOSED', "
            "'SCHEDULE_CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')",
            name="ck_jobs_status",
        ),
        CheckConstraint(
            "schedule_status IN ('NOT_PROPOSED', 'PENDING', 'CONFIRMED')",
            name="ck_jobs_schedule_status",
        ),
        CheckConstraint(
            "(schedule_date IS NULL AND schedule_time IS NULL) OR "
            "(schedule_date IS NOT NULL AND schedule_time IS NOT NULL)",
            name="ck_jobs_schedule_pair",
        ),
        CheckConstraint(
            "schedule_status = 'NOT_PROPOSED' OR "
            "(schedule_date IS NOT NULL AND schedule_time IS NOT NULL)",
            name="ck_jobs_schedule_required",
        ),
        CheckConstraint(
            "rating BETWEEN 1 AND 5",
            name="ck_jobs_rating",
        ),
        CheckConstraint(
            "(rating IS NULL AND review_text IS NULL AND reviewed_at IS NULL) "
            "OR (status = 'COMPLETED' AND rating IS NOT NULL "
            "AND reviewed_at IS NOT NULL)",
            name="ck_jobs_review",
        ),
        CheckConstraint(
            "status <> 'COMPLETED' OR completed_at IS NOT NULL",
            name="ck_jobs_completion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("service_requests.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    provider_id: Mapped[int] = mapped_column(
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
    )

    schedule_date: Mapped[date | None] = mapped_column(Date)
    schedule_time: Mapped[time | None] = mapped_column(Time)
    schedule_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="NOT_PROPOSED",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default="JOB_CREATED",
    )

    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    cancelled_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    rating: Mapped[int | None] = mapped_column(Integer)
    review_text: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )