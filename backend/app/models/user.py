from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "role IN ('CLIENT', 'INDIVIDUAL_PROVIDER', "
            "'COMPANY_MANAGER', 'EMPLOYEE', 'SYSTEM_ADMIN')",
            name="ck_users_role",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE')",
            name="ck_users_status",
        ),
        CheckConstraint(
            "(role IN ('CLIENT', 'SYSTEM_ADMIN') AND provider_id IS NULL) "
            "OR "
            "(role IN ('INDIVIDUAL_PROVIDER', 'COMPANY_MANAGER', 'EMPLOYEE') "
            "AND provider_id IS NOT NULL)",
            name="ck_users_provider_scope",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    provider_id: Mapped[int | None] = mapped_column(
        ForeignKey("providers.id", ondelete="RESTRICT"),
        index=True,
    )
    role: Mapped[str] = mapped_column(String(30), nullable=False)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
        unique=True,
    )
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="PENDING",
    )
    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )

    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    verification_token_hash: Mapped[str | None] = mapped_column(
        String(64),
    )
    verification_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    reset_token_hash: Mapped[str | None] = mapped_column(String(64))
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(
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