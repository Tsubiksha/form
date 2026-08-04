from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False)
    setting_key = Column(String, unique=True, index=True, nullable=False)
    setting_value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_by = Column(Integer, nullable=True) # User ID of the admin who updated it
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
