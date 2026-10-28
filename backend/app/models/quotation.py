from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Quotation(Base):
    __tablename__ = "quotations"

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'EXPIRED')",
            name="ck_quotations_status",
        ),
        CheckConstraint(
            "subtotal >= 0 AND total_amount >= 0",
            name="ck_quotations_amounts",
        ),
        CheckConstraint(
            "downpayment_amount >= 0 AND downpayment_amount <= total_amount",
            name="ck_quotations_downpayment",
        ),
        Index(
            "uq_quotations_active_request",
            "request_id",
            unique=True,
            postgresql_where=text(
                "status IN ('DRAFT', 'SENT', 'APPROVED')"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("service_requests.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="DRAFT",
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default="0",
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default="0",
    )
    downpayment_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default="0",
    )

    valid_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    note: Mapped[str | None] = mapped_column(Text)

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