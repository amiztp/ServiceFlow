from pydantic import BaseModel, ConfigDict, Field, field_validator


class SkillCreateRequest(BaseModel):
    skill_name: str = Field(min_length=1, max_length=100)

    model_config = ConfigDict(extra="forbid")

    @field_validator("skill_name")
    @classmethod
    def validate_skill_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Skill name cannot be blank")

        return value


class SkillResponse(BaseModel):
    id: int
    user_id: int
    skill_name: str

    model_config = ConfigDict(from_attributes=True)