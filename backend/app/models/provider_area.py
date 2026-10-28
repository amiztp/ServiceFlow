from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ProviderArea(Base):
    __tablename__ = "provider_areas"

    __table_args__ = (
        UniqueConstraint(
            "provider_id",
            "area_name",
            name="uq_provider_areas_provider_area",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    provider_id: Mapped[int] = mapped_column(
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    area_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )