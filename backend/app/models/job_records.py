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
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class JobRecord(Base):
    __tablename__ = "job_records"

    __table_args__ = (
        CheckConstraint(
            "record_type IN ('STATUS', 'NOTE', 'MATERIAL', 'PHOTO')",
            name="ck_job_records_type",
        ),
        CheckConstraint(
            "record_type NOT IN ('STATUS', 'NOTE') OR "
            "(note IS NOT NULL AND length(trim(note)) > 0)",
            name="ck_job_records_note",
        ),
        CheckConstraint(
            "record_type <> 'MATERIAL' OR "
            "(material_name IS NOT NULL "
            "AND length(trim(material_name)) > 0 "
            "AND quantity IS NOT NULL AND quantity > 0 "
            "AND unit IS NOT NULL AND length(trim(unit)) > 0)",
            name="ck_job_records_material",
        ),
        CheckConstraint(
            "record_type <> 'PHOTO' OR "
            "(file_path IS NOT NULL AND length(trim(file_path)) > 0 "
            "AND file_name IS NOT NULL AND length(trim(file_name)) > 0 "
            "AND content_type IS NOT NULL "
            "AND content_type LIKE 'image/%')",
            name="ck_job_records_photo",
        ),
        CheckConstraint(
            "quantity IS NULL OR quantity > 0",
            name="ck_job_records_quantity",
        ),
        Index(
            "ix_job_records_job_created",
            "job_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    record_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text)

    material_name: Mapped[str | None] = mapped_column(String(150))
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit: Mapped[str | None] = mapped_column(String(30))

    file_path: Mapped[str | None] = mapped_column(Text)
    file_name: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(150))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )