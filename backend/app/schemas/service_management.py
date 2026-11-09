from decimal import Decimal
from typing import Annotated
from pydantic import BaseModel, Field, field_validator
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

ServiceName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Category = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Price = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Patch(Input):
    @model_validator(mode="after")
    def require_changes(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        for field in self.model_fields_set:
            if field not in {"description", "category"} and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class ServiceCreate(Input):
    name: ServiceName
    description: str | None = None
    category: str = Field(
        min_length=1,
        max_length=100,
    )

    @field_validator("category")
    @classmethod
    def validate_category(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Category cannot be empty")

        return value


class ServicePatch(Patch):
    name: ServiceName | None = None
    description: str | None = None
    category: Category | None = None
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    category: str | None
    is_active: bool


class OfferingCreate(Input):
    service_id: int = Field(gt=0)
    description: str | None = None
    starting_price: Price


class OfferingPatch(Patch):
    description: str | None = None
    starting_price: Price | None = None
    is_active: bool | None = None


class PublicOffering(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    service_name: str
    description: str | None
    starting_price: Decimal


class OfferingRead(PublicOffering):
    is_active: bool
    catalog_is_active: bool


class ProviderSummary(BaseModel):
    id: int
    type: str
    name: str
    description: str | None
    accepting_requests: bool
    rating: float | None
    completed_jobs: int
    starting_price: Decimal | None


class PublicPolicy(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    policy_type: str


class ProviderDetail(ProviderSummary):
    email: str
    phone: str
    address: str | None
    areas: list[str]
    services: list[PublicOffering]
    policies: list[PublicPolicy]
