from math import ceil
from typing import Any

from sqlalchemy.orm import Session


# ADAPT THIS IMPORT if your Notification model is declared in a different module.
from app.models.notifications import Notification

def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
) -> Notification:
    """
    Create an in-app notification inside the caller's current transaction.

    IMPORTANT:
    - This function deliberately does NOT commit.
    - The business-event service must commit the business change and notification
      together, or roll both back together.
    - Do not expose this helper as a public POST endpoint.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False,
    )
    db.add(notification)
    db.flush()
    return notification


def get_user_notifications(
    db: Session,
    *,
    user_id: int,
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
) -> dict[str, Any]:
    query = db.query(Notification).filter(Notification.user_id == user_id)

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    total = query.count()
    items = (
        query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": ceil(total / limit) if total else 0,
    }


def get_user_unread_count(db: Session, *, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .count()
    )


def mark_user_notification_as_read(
    db: Session,
    *,
    user_id: int,
    notification_id: int,
) -> Notification | None:
    # Scoping in the query makes another user's notification indistinguishable
    # from a nonexistent ID: both return None and the router responds with 404.
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )

    if notification is None:
        return None

    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_user_notifications_as_read(db: Session, *, user_id: int) -> int:
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .update(
            {Notification.is_read: True},
            synchronize_session=False,
        )
    )
    db.commit()
    return int(updated_count)
