from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Dispute(Base):
    __tablename__ = "disputes"

    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'UNDER_REVIEW', 'CLOSED')",
            name="ck_disputes_status",
        ),
        CheckConstraint(
            "length(trim(reason)) > 0",
            name="ck_disputes_reason",
        ),
        CheckConstraint(
            "length(trim(description)) > 0",
            name="ck_disputes_description",
        ),
        CheckConstraint(
            "(status = 'CLOSED' AND closed_at IS NOT NULL) OR "
            "(status <> 'CLOSED' AND closed_at IS NULL)",
            name="ck_disputes_closed_at",
        ),
        CheckConstraint(
            "closed_at IS NULL OR closed_at >= created_at",
            name="ck_disputes_closed_order",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    opened_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="OPEN",
    )
    admin_note: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )