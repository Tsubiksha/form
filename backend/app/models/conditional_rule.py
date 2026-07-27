from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from app.db.database import Base


class ConditionalRule(Base):
    __tablename__ = "conditional_rules"
    __table_args__ = (
        UniqueConstraint(
            "form_id",
            "trigger_field_id",
            "operator",
            "comparison_value",
            "target_field_id",
            "action",
            name="uq_conditional_rule_identity",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    operator = Column(String, nullable=False)
    comparison_value = Column(String, nullable=True)
    target_field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
