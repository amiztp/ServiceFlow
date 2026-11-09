"""OPTIONAL API extensions: activate only after the team approves the contract.

These endpoints are not listed in proposal §15.5; they implement its
request-review and optional-photo functional requirements.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.service_request import (
    RequestAttachmentRead, RequestInformation, RequestRead,
)
from app.services import request_attachment_service as attachments
from app.services import request_service as service

router = APIRouter(prefix="/requests", tags=["Service Request Extensions"])


def _translate(error: service.RequestServiceError):
    raise HTTPException(status_code=error.status_code, detail=error.detail) from error


@router.post("/{request_id}/review", response_model=RequestRead)
def start_review(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.start_review(db, current_user, request_id)
    except service.RequestServiceError as error:
        _translate(error)


@router.post("/{request_id}/request-information", response_model=RequestRead)
def request_more_information(
    request_id: int,
    payload: RequestInformation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.request_more_information(db, current_user, request_id, payload.message_text)
    except service.RequestServiceError as error:
        _translate(error)


@router.post("/{request_id}/attachments", response_model=RequestAttachmentRead,
             status_code=status.HTTP_201_CREATED)
async def upload_request_photo(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # +1 detects an oversized file without loading arbitrarily large content.
        content = await file.read(attachments.MAX_IMAGE_BYTES + 1)
        row = attachments.save_attachment(db, current_user, request_id, file, content)
        return {k: row[k] for k in ("id", "request_id", "file_name", "content_type", "created_at")}
    except service.RequestServiceError as error:
        _translate(error)
    finally:
        await file.close()


@router.get("/{request_id}/attachments", response_model=list[RequestAttachmentRead])
def list_request_photos(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.list_attachments(db, current_user, request_id)
    except service.RequestServiceError as error:
        _translate(error)


@router.get("/{request_id}/attachments/{attachment_id}")
def download_request_photo(
    request_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = service.get_attachment_for_download(db, current_user, request_id, attachment_id)
        path = attachments.get_safe_file_path(row["file_path"])
        return FileResponse(
            path,
            media_type=row["content_type"],
            filename=row["file_name"],
            content_disposition_type="attachment",
            headers={"X-Content-Type-Options": "nosniff"},
        )
    except service.RequestServiceError as error:
        _translate(error)
