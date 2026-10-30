from dataclasses import dataclass
from pathlib import Path
import re

import pymupdf


@dataclass(frozen=True)
class PolicyChunk:
    page_number: int
    chunk_index: int
    chunk_text: str


def extract_policy_chunks(
    pdf_path: str | Path,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[PolicyChunk]:
    if chunk_size <= 0 or not 0 <= overlap < chunk_size:
        raise ValueError("Require chunk_size > 0 and 0 <= overlap < chunk_size")

    chunks: list[PolicyChunk] = []

    with pymupdf.open(pdf_path) as document:
        for page_number, page in enumerate(document, start=1):
            text = " ".join(page.get_text("text").split())
            if not text:
                continue

            sentences = re.split(r"(?<=[.!?])\s+", text)
            current: list[str] = []

            for sentence in sentences:
                candidate = " ".join([*current, sentence])

                if current and len(candidate) > chunk_size:
                    chunks.append(
                        PolicyChunk(page_number, len(chunks), " ".join(current))
                    )

                    # Carry whole sentences into the next chunk.
                    carry: list[str] = []
                    for previous in reversed(current):
                        if len(" ".join([previous, *carry])) > overlap:
                            break
                        carry.insert(0, previous)

                    current = [*carry, sentence]
                else:
                    current.append(sentence)

            if current:
                chunks.append(
                    PolicyChunk(page_number, len(chunks), " ".join(current))
                )

    return chunks