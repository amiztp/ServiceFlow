from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class AdminProviderResponse(BaseModel):
    id: int
    type: str
    name: str
    description: str | None
    email: EmailStr
    phone: str
    address: str | None
    verification_status: str
    accepting_requests: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminProviderListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminProviderResponse]


class ProviderActionResponse(BaseModel):
    message: str
    provider: AdminProviderResponse