from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Policy(Base):
    __tablename__ = "policies"

    __table_args__ = (
        CheckConstraint(
            "policy_type IN ('SERVICE', 'WARRANTY', 'CANCELLATION', "
            "'PAYMENT', 'TERMS_AND_CONDITIONS')",
            name="ck_policies_type",
        ),
        CheckConstraint(
            "visibility IN ('PUBLIC', 'PRIVATE')",
            name="ck_policies_visibility",
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_policies_status",
        ),
        CheckConstraint(
            "length(trim(title)) > 0",
            name="ck_policies_title",
        ),
        CheckConstraint(
            "length(trim(file_path)) > 0",
            name="ck_policies_file_path",
        ),
        UniqueConstraint(
            "id",
            "provider_id",
            name="uq_policies_id_provider",
        ),
        Index(
            "uq_policies_active_provider_type",
            "provider_id",
            "policy_type",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    provider_id: Mapped[int] = mapped_column(
        ForeignKey("providers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    policy_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False)

    visibility: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="PRIVATE",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="INACTIVE",
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