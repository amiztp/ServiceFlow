"""Small, controlled photo storage; no general-purpose document management."""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.services import request_service as requests

MAX_IMAGE_BYTES = 5 * 1024 * 1024
EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def storage_root() -> Path:
    return Path(os.environ.get("SERVICEFLOW_UPLOAD_ROOT", "storage")).resolve()


def _safe_filename(name: str | None) -> str:
    name = (name or "photo").replace("\\", "/").split("/")[-1].strip()
    if not name or "\x00" in name:
        requests.fail(422, "Invalid filename")
    return name[:255]


def _validate_image(content: bytes, content_type: str) -> None:
    if content_type not in EXTENSIONS:
        requests.fail(415, "Only JPEG, PNG and WebP request photos are supported")
    if not content:
        requests.fail(422, "Empty file")
    if len(content) > MAX_IMAGE_BYTES:
        requests.fail(413, "Photo exceeds 5 MiB limit")
    signatures = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
    }
    if not signatures[content_type]:
        requests.fail(415, "File content does not match its image type")


def save_attachment(db: Session, user: Any, request_id: int, upload: UploadFile,
                    content: bytes) -> dict[str, Any]:
    requests.check_client_can_upload(db, user, request_id)
    content_type = upload.content_type or ""
    _validate_image(content, content_type)
    filename = _safe_filename(upload.filename)
    relative_path = Path("request_attachments") / (uuid.uuid4().hex + EXTENSIONS[content_type])
    path = storage_root() / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Exclusive creation avoids accidental overwrite of an existing file.
        with path.open("xb") as target:
            target.write(content)
        attachments = requests.tables(db)["request_attachments"]
        attachment_id = db.execute(insert(attachments).values(
            request_id=request_id,
            file_path=relative_path.as_posix(),
            file_name=filename,
            content_type=content_type,
        ).returning(attachments.c.id)).scalar_one()
        db.commit()
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return requests.get_attachment_for_download(db, user, request_id, attachment_id)


def get_safe_file_path(relative_path: str) -> Path:
    root = storage_root()
    path = (root / relative_path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        requests.fail(404, "Attachment file not found")
    return path
