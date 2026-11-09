
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProviderProfileResponse(BaseModel):
    id: int
    type: str
    name: str
    description: str | None
    email: EmailStr
    phone: str
    address: str | None
    verification_status: str
    accepting_requests: bool

    model_config = ConfigDict(from_attributes=True)


class ProviderProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    address: str | None = None

    @field_validator("name", "phone")
    @classmethod
    def validate_nonblank(cls, value):
        if value is not None and not value.strip():
            raise ValueError("This field cannot be blank")
        return value.strip() if value is not None else value

    @field_validator("description", "address")
    @classmethod
    def normalize_optional_text(cls, value):
        return value.strip() if value is not None else value
