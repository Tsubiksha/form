from pydantic import BaseModel, Field, field_validator
FIELD_TYPES = {"text", "email", "number", "textarea", "date", "checkbox", "dropdown", "radio", "multi_select", "checkbox_group", "file", "rating"}
class FieldCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    field_type: str
    required: bool = False
    placeholder: str | None = None
    help_text: str | None = None
    display_order: int = 0
    @field_validator("field_type")
    @classmethod
    def valid_type(cls, value):
        if value not in FIELD_TYPES: raise ValueError("Unsupported field type")
        return value
class FieldUpdate(BaseModel):
    label: str | None = None
    field_type: str | None = None
    required: bool | None = None
    placeholder: str | None = None
    help_text: str | None = None
    display_order: int | None = None
    @field_validator("field_type")
    @classmethod
    def valid_optional_type(cls, value):
        if value is not None and value not in FIELD_TYPES: raise ValueError("Unsupported field type")
        return value


class FieldReorderItem(BaseModel):
    field_id: int
    display_order: int


class FieldReorderRequest(BaseModel):
    fields: list[FieldReorderItem]

class FieldOptionCreate(BaseModel):
    option_label: str = Field(min_length=1, max_length=200)
    option_value: str = Field(min_length=1, max_length=200)
    display_order: int = 0

class FieldOptionUpdate(BaseModel):
    option_label: str | None = Field(default=None, min_length=1, max_length=200)
    option_value: str | None = Field(default=None, min_length=1, max_length=200)
    display_order: int | None = None

class OptionReorderItem(BaseModel):
    option_id: int
    display_order: int

class OptionReorderRequest(BaseModel):
    options: list[OptionReorderItem]
