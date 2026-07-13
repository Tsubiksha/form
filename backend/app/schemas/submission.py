from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class SubmissionCreate(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)

class SubmissionValueResponse(BaseModel):
    field_id: int
    field_label: str | None = None
    value: Any = None

class SubmissionResponse(BaseModel):
    id: int
    form_id: int
    form_version_id: int
    submitted_at: datetime
    submitter_ip: str | None
    values: list[SubmissionValueResponse]
