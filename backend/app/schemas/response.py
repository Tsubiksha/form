from datetime import datetime
from pydantic import BaseModel, Field

class ValidationRuleResponse(BaseModel):
    id: int
    rule_type: str
    rule_value: str | None = None
    error_message: str | None = None
    model_config = {"from_attributes": True}

class FieldOptionResponse(BaseModel):
    id: int
    option_label: str
    option_value: str
    display_order: int
    model_config = {"from_attributes": True}

class FieldResponse(BaseModel):
    id: int
    label: str
    field_type: str
    required: bool
    placeholder: str | None = None
    help_text: str | None = None
    display_order: int
    validation_rules: list[ValidationRuleResponse] = Field(default_factory=list)
    options: list[FieldOptionResponse] = Field(default_factory=list)
    model_config = {"from_attributes": True}

class FormResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    fields: list[FieldResponse] = Field(default_factory=list)
    status: str = "draft"
    user_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}
