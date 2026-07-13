from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from app.db.database import Base

class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"))
    form_version_id = Column(Integer, ForeignKey("form_versions.id"))
    link_token = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
