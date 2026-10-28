from datetime import time

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class WorkingHour(Base):
    __tablename__ = "working_hours"

    __table_args__ = (
        UniqueConstraint(
            "provider_id",
            "day_of_week",
            name="uq_working_hours_provider_day",
        ),
        CheckConstraint(
            "day_of_week BETWEEN 0 AND 6",
            name="ck_working_hours_day",
        ),
        CheckConstraint(
            "(is_closed = true "
            "AND start_time IS NULL AND end_time IS NULL) "
            "OR "
            "(is_closed = false "
            "AND start_time IS NOT NULL AND end_time IS NOT NULL "
            "AND start_time < end_time)",
            name="ck_working_hours_times",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    provider_id: Mapped[int] = mapped_column(
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)

    is_closed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )