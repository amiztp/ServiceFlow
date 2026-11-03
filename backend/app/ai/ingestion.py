from dataclasses import dataclass
from pathlib import Path
import re

import pymupdf


HEADINGS = {
    "Booking an Appointment",
    "Rescheduling",
    "Cancellation",
    "Workmanship Warranty",
    "Payment",
    "Complaints",
}


@dataclass(frozen=True)
class PolicyChunk:
    page_number: int
    chunk_index: int
    chunk_text: str
    section_title: str | None = None


def extract_policy_chunks(
    pdf_path: str | Path,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[PolicyChunk]:
    if chunk_size <= 0 or not 0 <= overlap < chunk_size:
        raise ValueError("Require chunk_size > 0 and 0 <= overlap < chunk_size")

    chunks: list[PolicyChunk] = []

    def add_section(page_number: int, title: str | None, lines: list[str]) -> None:
        text = " ".join(lines).strip()
        if not text:
            return

        sentences = re.split(r"(?<=[.!?])\s+", text)
        current: list[str] = []

        for sentence in sentences:
            candidate = " ".join([*current, sentence])
            if current and len(candidate) > chunk_size:
                chunks.append(
                    PolicyChunk(
                        page_number,
                        len(chunks),
                        " ".join(current),
                        title,
                    )
                )
                # Carry complete sentences forward, never part of a sentence.
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
                PolicyChunk(page_number, len(chunks), " ".join(current), title)
            )

    with pymupdf.open(pdf_path) as document:
        for page_number, page in enumerate(document, start=1):
            title: str | None = None
            section_lines: list[str] = []

            for raw_line in page.get_text("text").splitlines():
                line = " ".join(raw_line.split())
                if not line:
                    continue

                if line in HEADINGS:
                    add_section(page_number, title, section_lines)
                    title = line
                    section_lines = []
                elif title is not None:
                    section_lines.append(line)

            add_section(page_number, title, section_lines)

    return chunks