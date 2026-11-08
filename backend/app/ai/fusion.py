from collections import defaultdict

from app.models.policy_chunk import PolicyChunk


def reciprocal_rank_fusion(
    vector_results: list[PolicyChunk],
    keyword_results: list[PolicyChunk],
    *,
    k: int = 60,
) -> list[tuple[PolicyChunk, float]]:
    scores: dict[int, float] = defaultdict(float)
    chunks: dict[int, PolicyChunk] = {}

    for results in (vector_results, keyword_results):
        for rank, chunk in enumerate(results, start=1):
            chunks[chunk.id] = chunk
            scores[chunk.id] += 1 / (k + rank)

    return [
        (chunks[chunk_id], score)
        for chunk_id, score in sorted(
            scores.items(), key=lambda item: (-item[1], item[0])
        )
    ]