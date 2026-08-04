from pydantic import BaseModel
from typing import List, Optional

class SettingUpdate(BaseModel):
    setting_key: str
    setting_value: str

class CategoryUpdate(BaseModel):
    category: str
    settings: List[SettingUpdate]

class BulkSettingsUpdate(BaseModel):
    categories: List[CategoryUpdate]

class SettingResponse(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str] = None
    category: str

    class Config:
        orm_mode = True

class TestEmailRequest(BaseModel):
    smtpHost: str
    smtpPort: int
    encryption: str
    senderEmail: str
