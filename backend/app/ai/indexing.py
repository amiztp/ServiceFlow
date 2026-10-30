from functools import lru_cache

from sentence_transformers import SentenceTransformer
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ai.ingestion import extract_policy_chunks
from app.models.policy import Policy
from app.models.policy_chunk import PolicyChunk

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def embedding_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def index_policy(policy_id: int, session: Session) -> int:
    """Replace chunks for an inactive policy.

    The caller owns the transaction and must commit or roll it back.
    """
    policy = session.get(Policy, policy_id)
    if policy is None:
        raise ValueError(f"Policy {policy_id} does not exist")
    if policy.status != "INACTIVE":
        raise ValueError("Only INACTIVE policies can be indexed")

    file_path = policy.file_path
    provider_id = policy.provider_id
    chunks = extract_policy_chunks(file_path)
    if not chunks:
        raise ValueError("PDF contains no extractable text")

    vectors = embedding_model().encode(
        [chunk.chunk_text for chunk in chunks],
        normalize_embeddings=True,
    )
    if vectors.shape != (len(chunks), 384):
        raise ValueError(f"Unexpected embedding shape: {vectors.shape}")

    # Recheck after PDF processing. This lock serializes retries for this policy.
    locked_policy = session.execute(
        select(Policy).where(Policy.id == policy_id).with_for_update()
    ).scalar_one()

    if locked_policy.status != "INACTIVE":
        raise ValueError("Policy became ACTIVE during indexing")
    if (
        locked_policy.file_path != file_path
        or locked_policy.provider_id != provider_id
    ):
        raise ValueError("Policy changed during indexing")

    session.execute(
        delete(PolicyChunk).where(PolicyChunk.policy_id == policy_id)
    )
    session.add_all(
        PolicyChunk(
            policy_id=policy_id,
            provider_id=provider_id,
            page_number=chunk.page_number,
            section_title=getattr(chunk, "section_title", None),
            chunk_index=chunk.chunk_index,
            chunk_text=chunk.chunk_text,
            embedding=vector.tolist(),
        )
        for chunk, vector in zip(chunks, vectors)
    )
    session.flush()  # Surface database errors before reporting success.
    return len(chunks)