from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# ADAPT THESE TWO IMPORTS to your existing project dependency locations.
from app.database import get_db
from app.core.dependencies import get_current_user

from app.schemas.notification import (
    NotificationListResponse,
    NotificationReadAllResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification_service import (
    get_user_notifications,
    get_user_unread_count,
    mark_all_user_notifications_as_read,
    mark_user_notification_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _authenticated_user_id(current_user) -> int:
    """Read the user ID from the authenticated backend user object."""
    user_id = getattr(current_user, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user ID is unavailable",
        )
    return user_id


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get my notifications",
)
def list_my_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _authenticated_user_id(current_user)
    return get_user_notifications(
        db,
        user_id=user_id,
        page=page,
        limit=limit,
        unread_only=unread_only,
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
    summary="Get my unread notification count",
)
def get_my_unread_notification_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _authenticated_user_id(current_user)
    return {"unread_count": get_user_unread_count(db, user_id=user_id)}


@router.patch(
    "/read-all",
    response_model=NotificationReadAllResponse,
    summary="Mark all my notifications as read",
)
def mark_all_my_notifications_as_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _authenticated_user_id(current_user)
    updated_count = mark_all_user_notifications_as_read(db, user_id=user_id)
    return {
        "updated_count": updated_count,
        "message": "All unread notifications have been marked as read.",
    }


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark one of my notifications as read",
)
def mark_one_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _authenticated_user_id(current_user)
    notification = mark_user_notification_as_read(
        db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification
