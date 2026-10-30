from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    __table_args__ = (
        CheckConstraint(
            "total_amount >= 0",
            name="ck_invoices_total",
        ),
        CheckConstraint(
            "downpayment_amount >= 0 AND downpayment_amount <= total_amount",
            name="ck_invoices_downpayment",
        ),
        CheckConstraint(
            "paid_amount >= 0 AND paid_amount <= total_amount",
            name="ck_invoices_paid_amount",
        ),
        CheckConstraint(
            "payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')",
            name="ck_invoices_payment_status",
        ),
        CheckConstraint(
            "(payment_status = 'UNPAID' "
            "AND paid_amount = 0 AND total_amount > 0) OR "
            "(payment_status = 'PARTIALLY_PAID' "
            "AND paid_amount > 0 AND paid_amount < total_amount) OR "
            "(payment_status = 'PAID' AND paid_amount = total_amount)",
            name="ck_invoices_payment_consistency",
        ),
        CheckConstraint(
            "(payment_status = 'PAID' AND paid_at IS NOT NULL) OR "
            "(payment_status <> 'PAID' AND paid_at IS NULL)",
            name="ck_invoices_paid_at",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    invoice_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    downpayment_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default="0",
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default="0",
    )

    payment_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="UNPAID",
    )

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )