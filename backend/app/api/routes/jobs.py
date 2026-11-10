from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import os
import uuid

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.job import (
    JobAssign, JobCancel, JobDetail, JobListResponse, JobRead, JobRecordCreate,
    JobRecordList, JobRecordRead, JobSchedule,
)
from app.services import job_service as service

router = APIRouter(prefix="/jobs", tags=["Jobs"])

MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _translate(error: service.JobServiceError):
    raise HTTPException(status_code=error.status_code, detail=error.detail) from error


def _storage_root() -> Path:
    return Path(os.environ.get("SERVICEFLOW_JOB_UPLOAD_ROOT", "storage")).resolve()


@router.get("", response_model=JobListResponse)
def list_jobs(
    status_filter: str | None = Query(default=None, alias="status"),
    schedule_status: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.list_jobs(db, current_user, status=status_filter,
                                 schedule_status=schedule_status, limit=limit, offset=offset)
    except service.JobServiceError as error:
        _translate(error)


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: int, db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    try:
        return service.get_job(db, current_user, job_id)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/assign", response_model=JobRead)
def assign_employee(job_id: int, payload: JobAssign,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    try:
        return service.assign_employee(db, current_user, job_id, payload.employee_id)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/schedule", response_model=JobRead)
def propose_schedule(job_id: int, payload: JobSchedule,
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    try:
        return service.propose_schedule(db, current_user, job_id,
                                        payload.schedule_date, payload.schedule_time)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/schedule/approve", response_model=JobRead)
def approve_schedule(job_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    try:
        return service.approve_schedule(db, current_user, job_id)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/start", response_model=JobRead)
def start_job(job_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    try:
        return service.start_job(db, current_user, job_id)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/complete", response_model=JobRead)
def complete_job(job_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    try:
        return service.complete_job(db, current_user, job_id)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/cancel", response_model=JobRead)
def cancel_job(job_id: int, payload: JobCancel,
               db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    try:
        return service.cancel_job(db, current_user, job_id, payload.reason)
    except service.JobServiceError as error:
        _translate(error)


@router.get("/{job_id}/records", response_model=JobRecordList)
def list_job_records(job_id: int, limit: int = Query(default=50, ge=1, le=100),
                     offset: int = Query(default=0, ge=0),
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    try:
        return service.list_records(db, current_user, job_id, limit=limit, offset=offset)
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/records", response_model=JobRecordRead,
             status_code=status.HTTP_201_CREATED)
def create_job_record(job_id: int, payload: JobRecordCreate,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    try:
        return service.create_record(db, current_user, job_id, payload.model_dump())
    except service.JobServiceError as error:
        _translate(error)


@router.post("/{job_id}/records/photo", response_model=JobRecordRead,
             status_code=status.HTTP_201_CREATED)
async def upload_job_photo(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stored_path = None
    try:
        content_type = file.content_type or ""
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are supported")
        content = await file.read(MAX_PHOTO_BYTES + 1)
        if len(content) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=413, detail="Photo exceeds 5 MiB limit")
        signatures = {
            "image/jpeg": content.startswith(b"\xff\xd8\xff"),
            "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
        }
        if not signatures[content_type]:
            raise HTTPException(status_code=415, detail="File content does not match image type")
        root = _storage_root()
        relative = Path("job_records") / f"{uuid.uuid4().hex}{ALLOWED_IMAGE_TYPES[content_type]}"
        stored_path = root / relative
        stored_path.parent.mkdir(parents=True, exist_ok=True)
        with stored_path.open("xb") as handle:
            handle.write(content)
        row = service.upload_photo_record(
            db, current_user, job_id, file_path=relative.as_posix(),
            file_name=(file.filename or "job-photo")[:255], content_type=content_type,
        )
        return row
    except service.JobServiceError as error:
        if stored_path:
            stored_path.unlink(missing_ok=True)
        _translate(error)
    except Exception:
        if stored_path:
            stored_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()


@router.get("/{job_id}/records/{record_id}/photo")
def download_job_photo(job_id: int, record_id: int,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    try:
        row = service.get_photo_record(db, current_user, job_id, record_id)
        root = _storage_root()
        path = (root / row["file_path"]).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise HTTPException(status_code=404, detail="Job photo file not found")
        return FileResponse(path, media_type=row["content_type"],
                            filename=row["file_name"], content_disposition_type="attachment",
                            headers={"X-Content-Type-Options": "nosniff"})
    except service.JobServiceError as error:
        _translate(error)
