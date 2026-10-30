import numpy as np
from sentence_transformers import SentenceTransformer

from app.ai.ingestion import PolicyChunk

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def search_chunks(
    question: str,
    chunks: list[PolicyChunk],
    top_k: int = 3,
) -> list[tuple[PolicyChunk, float]]:
    if not chunks:
        return []

    model = SentenceTransformer(MODEL_NAME)
    texts = [chunk.chunk_text for chunk in chunks]
    vectors = model.encode(texts, normalize_embeddings=True)
    question_vector = model.encode(question, normalize_embeddings=True)

    if vectors.shape[1] != 384:
        raise ValueError(f"Expected 384 dimensions, got {vectors.shape[1]}")

    scores = np.asarray(vectors @ question_vector)
    best_indices = np.argsort(scores)[::-1][:top_k]
    return [(chunks[int(i)], float(scores[i])) for i in best_indices]