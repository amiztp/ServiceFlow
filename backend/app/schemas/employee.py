from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class EmployeeCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "phone")
    @classmethod
    def validate_text(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank")

        return value


class EmployeeManagerUpdateRequest(BaseModel):
    email: EmailStr | None = None
    status: Literal["ACTIVE", "INACTIVE"] | None = None

    model_config = ConfigDict(extra="forbid")


class EmployeeProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, min_length=7, max_length=30)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "phone")
    @classmethod
    def validate_text(cls, value):
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank")

        return value


class EmployeeResponse(BaseModel):
    id: int
    provider_id: int
    name: str
    email: EmailStr
    phone: str
    role: str
    status: str
    must_change_password: bool

    model_config = ConfigDict(from_attributes=True)


class EmployeeCreateResponse(EmployeeResponse):
    initial_password: str