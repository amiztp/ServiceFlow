from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    __table_args__ = (
        ForeignKeyConstraint(
            ["provider_id", "service_id"],
            ["provider_services.provider_id", "provider_services.service_id"],
            name="fk_service_requests_provider_service",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('NEW', 'UNDER_REVIEW', 'NEED_INFORMATION', "
            "'QUOTATION_SENT', 'REJECTED', 'CANCELLED')",
            name="ck_service_requests_status",
        ),
        CheckConstraint(
            "latitude BETWEEN -90 AND 90",
            name="ck_service_requests_latitude",
        ),
        CheckConstraint(
            "longitude BETWEEN -180 AND 180",
            name="ck_service_requests_longitude",
        ),
        CheckConstraint(
            "(latitude IS NULL AND longitude IS NULL) OR "
            "(latitude IS NOT NULL AND longitude IS NOT NULL)",
            name="ck_service_requests_coordinates",
        ),
        Index(
            "ix_service_requests_provider_service",
            "provider_id",
            "service_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    provider_id: Mapped[int] = mapped_column(nullable=False)
    service_id: Mapped[int] = mapped_column(
        nullable=False,
        index=True,
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    preferred_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time: Mapped[time | None] = mapped_column(Time)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default="NEW",
    )

    rejection_reason: Mapped[str | None] = mapped_column(Text)
    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    cancelled_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
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