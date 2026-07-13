from pydantic import BaseModel, Field, field_validator

class FormCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def title_required(cls, value):
        if not value.strip(): raise ValueError("Form title is required")
        return value.strip()

class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def valid_title(cls, value):
        if value is not None and not value.strip(): raise ValueError("Form title is required")
        return value.strip() if value else value
