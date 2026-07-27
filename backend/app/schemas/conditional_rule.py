from datetime import datetime
from pydantic import BaseModel, Field, field_validator


CONDITIONAL_OPERATORS = {
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "in",
    "not_in",
    "is_empty",
    "is_not_empty",
}
CONDITIONAL_ACTIONS = {"show", "hide", "require", "optional"}


class ConditionalRuleCreate(BaseModel):
    trigger_field_id: int
    operator: str
    comparison_value: str | None = Field(default=None, max_length=500)
    target_field_id: int
    action: str

    @field_validator("operator")
    @classmethod
    def valid_operator(cls, value):
        if value not in CONDITIONAL_OPERATORS:
            raise ValueError("Unsupported conditional operator")
        return value

    @field_validator("action")
    @classmethod
    def valid_action(cls, value):
        if value not in CONDITIONAL_ACTIONS:
            raise ValueError("Unsupported conditional action")
        return value


class ConditionalRuleUpdate(BaseModel):
    trigger_field_id: int | None = None
    operator: str | None = None
    comparison_value: str | None = Field(default=None, max_length=500)
    target_field_id: int | None = None
    action: str | None = None

    @field_validator("operator")
    @classmethod
    def valid_optional_operator(cls, value):
        if value is not None and value not in CONDITIONAL_OPERATORS:
            raise ValueError("Unsupported conditional operator")
        return value

    @field_validator("action")
    @classmethod
    def valid_optional_action(cls, value):
        if value is not None and value not in CONDITIONAL_ACTIONS:
            raise ValueError("Unsupported conditional action")
        return value


class ConditionalRuleResponse(BaseModel):
    id: int
    form_id: int
    trigger_field_id: int
    operator: str
    comparison_value: str | None = None
    target_field_id: int
    action: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
