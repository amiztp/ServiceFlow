
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProviderRegisterRequest(BaseModel):
    provider_name: str = Field(min_length=2, max_length=150)
    provider_email: EmailStr
    provider_phone: str = Field(min_length=7, max_length=30)
    address: str | None = None
    description: str | None = None

    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class ProviderRegisterResponse(BaseModel):
    user_id: int
    provider_id: int
    name: str
    email: EmailStr
    role: str
    user_status: str
    provider_status: str

class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=43, max_length=43)

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=43, max_length=43)
    new_password: str = Field(min_length=8, max_length=128)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

class AuthMeResponse(RegisterResponse):
    """Authenticated account details used by the frontend session bootstrap."""
    email_verified: bool
    # Provider verification status; null for client/system-admin accounts.
    # Kept under company_status for the existing frontend contract.
    company_status: str | None = None

