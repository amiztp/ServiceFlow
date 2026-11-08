from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.policy import Policy
from app.models.policy_chunk import PolicyChunk
from app.ai.indexing import embedding_model
import re

QUESTION_WORDS = {
    "a", "an", "the", "i", "is", "are", "was", "were",
    "what", "when", "where", "who", "why", "how",
    "can", "could", "do", "does", "must", "be",
    "for", "of", "in", "on", "to", "my", "our",
    "long",  # "how long" is question wording, not a policy term
}


def keyword_fallback_text(question: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", question.lower())
    return " ".join(word for word in words if word not in QUESTION_WORDS)


def keyword_search(
    db: Session,
    question: str,
    *,
    provider_id: int,
    limit: int = 5,
) -> list[PolicyChunk]:
    def run(search_text: str) -> list[PolicyChunk]:
        query = func.websearch_to_tsquery("english", search_text)
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

    results = run(question)
    if results:
        return results

    fallback = keyword_fallback_text(question)
    if not fallback or fallback == question.lower().strip():
        return []
    return run(fallback)


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