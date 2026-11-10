
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.working_hour import WorkingHour
from app.schemas.working_hour import WorkingHoursUpdate


def get_working_hours(
    db: Session,
    provider_id: int,
):
    return db.scalars(
        select(WorkingHour)
        .where(WorkingHour.provider_id == provider_id)
        .order_by(WorkingHour.day_of_week)
    ).all()


def replace_working_hours(
    db: Session,
    provider_id: int,
    data: WorkingHoursUpdate,
):
    try:
        existing = db.scalars(
            select(WorkingHour)
            .where(WorkingHour.provider_id == provider_id)
            .with_for_update()
        ).all()

        for item in existing:
            db.delete(item)

        db.flush()

        new_hours = [
            WorkingHour(
                provider_id=provider_id,
                day_of_week=item.day_of_week,
                start_time=item.start_time,
                end_time=item.end_time,
                is_closed=item.is_closed,
            )
            for item in data.working_hours
        ]

        db.add_all(new_hours)
        db.flush()

        result = get_working_hours(db, provider_id)

        db.commit()

        return result

    except Exception:
        db.rollback()
        raise
