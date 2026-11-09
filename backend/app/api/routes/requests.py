"""The seven official ServiceFlow /requests endpoints (proposal §15.5)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.service_request import (
    RequestCancel, RequestCreate, RequestDetail, RequestListResponse,
    RequestMessageCreate, RequestMessageList, RequestMessageRead,
    RequestRead, RequestReject,
)
from app.services import request_service as service

router = APIRouter(prefix="/requests", tags=["Service Requests"])


def _translate(error: service.RequestServiceError):
    raise HTTPException(status_code=error.status_code, detail=error.detail) from error


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.create_request(db, current_user, payload)
    except service.RequestServiceError as error:
        _translate(error)


@router.get("", response_model=RequestListResponse)
def list_requests(
    request_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.list_requests(db, current_user, status=request_status, limit=limit, offset=offset)
    except service.RequestServiceError as error:
        _translate(error)


@router.get("/{request_id}", response_model=RequestDetail)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.get_request(db, current_user, request_id)
    except service.RequestServiceError as error:
        _translate(error)


@router.post("/{request_id}/messages", response_model=RequestMessageRead,
             status_code=status.HTTP_201_CREATED)
def send_request_message(
    request_id: int,
    payload: RequestMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.send_message(db, current_user, request_id, payload.message_text)
    except service.RequestServiceError as error:
        _translate(error)


@router.get("/{request_id}/messages", response_model=RequestMessageList)
def list_request_messages(
    request_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.list_messages(db, current_user, request_id, limit=limit, offset=offset)
    except service.RequestServiceError as error:
        _translate(error)


@router.post("/{request_id}/cancel", response_model=RequestRead)
def cancel_request(
    request_id: int,
    payload: RequestCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.cancel_request(db, current_user, request_id, payload.reason)
    except service.RequestServiceError as error:
        _translate(error)


@router.post("/{request_id}/reject", response_model=RequestRead)
def reject_request(
    request_id: int,
    payload: RequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.reject_request(db, current_user, request_id, payload.reason)
    except service.RequestServiceError as error:
        _translate(error)
