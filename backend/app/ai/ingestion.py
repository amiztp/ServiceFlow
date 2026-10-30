from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF


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
    with fitz.open(pdf_path) as document:
        for page_number, page in enumerate(document, start=1):
            text = " ".join(page.get_text("text").split())
            if not text:
                continue

            start = 0
            while start < len(text):
                end = min(start + chunk_size, len(text))
                chunks.append(
                    PolicyChunk(
                        page_number=page_number,
                        chunk_index=len(chunks),
                        chunk_text=text[start:end],
                    )
                )
                if end == len(text):
                    break
                start = end - overlap

    return chunks