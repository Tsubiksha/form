from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, JSON, String
from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True, index=True)
    action = Column(String(80), nullable=False, index=True)
    entity_type = Column(String(80), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
