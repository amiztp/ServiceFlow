from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_quotation_items_quantity",
        ),
        CheckConstraint(
            "unit_price >= 0",
            name="ck_quotation_items_unit_price",
        ),
        CheckConstraint(
            "length(trim(description)) > 0",
            name="ck_quotation_items_description",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        nullable=False,
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )