from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PolicyChunk(Base):
    __tablename__ = "policy_chunks"

    __table_args__ = (
        ForeignKeyConstraint(
            ["policy_id", "provider_id"],
            ["policies.id", "policies.provider_id"],
            name="fk_policy_chunks_policy_provider",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "policy_id",
            "chunk_index",
            name="uq_policy_chunks_policy_chunk_index",
        ),
        CheckConstraint(
            "page_number >= 1",
            name="ck_policy_chunks_page_number",
        ),
        CheckConstraint(
            "chunk_index >= 0",
            name="ck_policy_chunks_chunk_index",
        ),
        CheckConstraint(
            "length(trim(chunk_text)) > 0",
            name="ck_policy_chunks_text",
        ),
        Index(
            "ix_policy_chunks_provider_policy",
            "provider_id",
            "policy_id",
        ),
        Index(
            "ix_policy_chunks_search_vector",
            "search_vector",
            postgresql_using="gin",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # Under the proposed versioning convention, this identifies
    # the exact immutable policy document revision.
    policy_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    provider_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    page_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    section_title: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    embedding: Mapped[list[float]] = mapped_column(
        Vector(384),
        nullable=False,
    )

    search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english'::regconfig, chunk_text)",
            persisted=True,
        ),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )