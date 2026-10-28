from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ProviderService(Base):
    __tablename__ = "provider_services"

    __table_args__ = (
        UniqueConstraint(
            "provider_id",
            "service_id",
            name="uq_provider_services_provider_service",
        ),
        CheckConstraint(
            "starting_price >= 0",
            name="ck_provider_services_starting_price",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    provider_id: Mapped[int] = mapped_column(
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(Text)

    starting_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
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