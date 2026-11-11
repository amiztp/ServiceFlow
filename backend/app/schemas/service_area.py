
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ServiceAreaCreate(BaseModel):
    area_name: str = Field(min_length=1, max_length=150)

    @field_validator("area_name")
    @classmethod
    def normalize_area_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Area name cannot be blank")

        return value


class ServiceAreaResponse(BaseModel):
    id: int
    provider_id: int
    area_name: str

    model_config = ConfigDict(from_attributes=True)


class ServiceAreaListResponse(BaseModel):
    service_areas: list[ServiceAreaResponse]
