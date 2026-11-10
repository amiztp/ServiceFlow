
from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkingHourItem(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    is_closed: bool = False

    @model_validator(mode="after")
    def validate_working_times(self):
        if self.is_closed:
            if self.start_time is not None or self.end_time is not None:
                raise ValueError(
                    "Closed days must not have start_time or end_time"
                )
        else:
            if self.start_time is None or self.end_time is None:
                raise ValueError(
                    "Open days require start_time and end_time"
                )

            if self.start_time >= self.end_time:
                raise ValueError(
                    "start_time must be earlier than end_time"
                )

        return self


class WorkingHoursUpdate(BaseModel):
    working_hours: list[WorkingHourItem] = Field(
        min_length=7,
        max_length=7,
    )

    @model_validator(mode="after")
    def validate_week(self):
        days = [item.day_of_week for item in self.working_hours]

        if len(set(days)) != 7:
            raise ValueError(
                "Each day of the week must appear exactly once"
            )

        if set(days) != set(range(7)):
            raise ValueError(
                "Working hours must include Monday through Sunday"
            )

        return self


class WorkingHourResponse(BaseModel):
    id: int
    provider_id: int
    day_of_week: int
    start_time: time | None
    end_time: time | None
    is_closed: bool

    model_config = ConfigDict(from_attributes=True)


class WorkingHoursResponse(BaseModel):
    working_hours: list[WorkingHourResponse]
