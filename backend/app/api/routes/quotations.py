"""The five official ServiceFlow quotation endpoints (proposal §15.6)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationDecision,
    QuotationRead,
    QuotationUpdate,
)
from app.services import quotation_service as service

router = APIRouter(tags=["Quotations"])


def _translate(error: service.QuotationServiceError):
    raise HTTPException(status_code=error.status_code, detail=error.detail) from error


@router.post(
    "/requests/{request_id}/quotations",
    response_model=QuotationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_quotation(
    request_id: int,
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.create_quotation(db, current_user, request_id, payload)
    except service.QuotationServiceError as error:
        _translate(error)


@router.get("/quotations/{quotation_id}", response_model=QuotationRead)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.get_quotation(db, current_user, quotation_id)
    except service.QuotationServiceError as error:
        _translate(error)


@router.patch("/quotations/{quotation_id}", response_model=QuotationRead)
def update_quotation(
    quotation_id: int,
    payload: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.update_draft_quotation(db, current_user, quotation_id, payload)
    except service.QuotationServiceError as error:
        _translate(error)


@router.post(
    "/quotations/{quotation_id}/approve",
    response_model=QuotationRead,
)
def approve_quotation(
    quotation_id: int,
    payload: QuotationDecision | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.approve_quotation(db, current_user, quotation_id)
    except service.QuotationServiceError as error:
        _translate(error)


@router.post(
    "/quotations/{quotation_id}/decline",
    response_model=QuotationRead,
)
def decline_quotation(
    quotation_id: int,
    payload: QuotationDecision | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.decline_quotation(db, current_user, quotation_id)
    except service.QuotationServiceError as error:
        _translate(error)
