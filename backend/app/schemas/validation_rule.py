from pydantic import BaseModel, field_validator
RULE_TYPES = {
    "required",
    "min_length",
    "max_length",
    "regex",
    "email",
    "min_value",
    "max_value",
    "min_date",
    "max_date",
    "file_size",
    "allowed_file_types",
    "rating_style",
    "low_label",
    "high_label",
}

class ValidationRuleCreate(BaseModel):
    rule_type: str
    rule_value: str | None = None
    error_message: str | None = None
    @field_validator("rule_type")
    @classmethod
    def valid_rule(cls, value):
        if value not in RULE_TYPES: raise ValueError("Unsupported validation rule")
        return value

class ValidationRuleUpdate(BaseModel):
    rule_type: str | None = None
    rule_value: str | None = None
    error_message: str | None = None
