from sqlalchemy import JSON, Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from app.db.database import Base

class FormVersion(Base):
    __tablename__ = "form_versions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"))
    version_number = Column(Integer, default=1)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    snapshot = Column(JSON, nullable=False, default=dict)
