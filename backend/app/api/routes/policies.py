import logging
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.ai.indexing import index_policy
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.models.policy import Policy
from app.models.provider import Provider

router = APIRouter(prefix="/policies", tags=["policies"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "storage" / "policies"
MAX_PDF_BYTES = 10 * 1024 * 1024

PolicyType = Literal[
    "SERVICE", "WARRANTY", "CANCELLATION", "PAYMENT", "TERMS_AND_CONDITIONS"
]


@router.post("/upload", status_code=201)
def upload_policy(
    title: str = Form(..., max_length=255),
    policy_type: PolicyType = Form(...),
    visibility: Literal["PUBLIC", "PRIVATE"] = Form("PRIVATE"),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    provider_id = user.provider_id
    if (
        user.role not in {"INDIVIDUAL_PROVIDER", "COMPANY_MANAGER"}
        or provider_id is None
    ):
        raise HTTPException(403, "You cannot publish provider policies")

    title = title.strip()
    if not title:
        raise HTTPException(422, "Title cannot be blank")

    content = file.file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF must be 10 MB or smaller")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(422, "Upload a PDF file")

    path = UPLOAD_DIR / f"{uuid4().hex}.pdf"

    try:
        # Serialize publication for this provider before inserting a revision.
        session.execute(
            select(Provider.id)
            .where(Provider.id == provider_id)
            .with_for_update()
        ).scalar_one()

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

        policy = Policy(
            provider_id=provider_id,
            title=title,
            policy_type=policy_type,
            visibility=visibility,
            file_path=str(path),
            status="INACTIVE",
        )
        session.add(policy)
        session.flush()
        policy_id = policy.id

        try:
            chunk_count = index_policy(policy_id, session)
        except ValueError as exc:
            raise HTTPException(422, "The PDF could not be indexed") from exc

        # Execute deactivation before flushing the new ACTIVE status.
        session.execute(
            update(Policy)
            .where(
                Policy.provider_id == provider_id,
                Policy.policy_type == policy_type,
                Policy.status == "ACTIVE",
            )
            .values(status="INACTIVE")
        )
        policy.status = "ACTIVE"
        session.flush()

    except Exception:
        session.rollback()
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not remove failed policy upload %s", path)
        raise

    # If the connection drops during commit, its outcome may be unknown.
    # Keep the file so a committed policy never points to a deleted PDF.
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Policy commit failed for %s", path)
        raise

    return {
        "policy_id": policy_id,
        "provider_id": provider_id,
        "status": "ACTIVE",
        "chunk_count": chunk_count,
    }