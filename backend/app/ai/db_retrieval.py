from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.policy import Policy
from app.models.policy_chunk import PolicyChunk
from app.ai.indexing import embedding_model


def keyword_search(
    db: Session,
    question: str,
    *,
    provider_id: int,
    limit: int = 5,
) -> list[PolicyChunk]:
    query = func.websearch_to_tsquery("english", question)
    rank = func.ts_rank_cd(PolicyChunk.search_vector, query)

    statement = (
        select(PolicyChunk)
        .join(Policy, Policy.id == PolicyChunk.policy_id)
        .where(
            Policy.provider_id == provider_id,
            PolicyChunk.provider_id == provider_id,
            Policy.status == "ACTIVE",
            Policy.visibility == "PUBLIC",
            PolicyChunk.search_vector.op("@@")(query),
        )
        .order_by(rank.desc(), PolicyChunk.id)
        .limit(limit)
    )
    return list(db.scalars(statement))



def vector_search(
    db: Session,
    question: str,
    *,
    provider_id: int,
    limit: int = 5,
) -> list[PolicyChunk]:
    vector = embedding_model().encode(
        question, normalize_embeddings=True
    ).tolist()

    statement = (
        select(PolicyChunk)
        .join(Policy, Policy.id == PolicyChunk.policy_id)
        .where(
            Policy.provider_id == provider_id,
            PolicyChunk.provider_id == provider_id,
            Policy.status == "ACTIVE",
            Policy.visibility == "PUBLIC",
        )
        .order_by(PolicyChunk.embedding.cosine_distance(vector))
        .limit(limit)
    )
    return list(db.scalars(statement))