from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class ValidationRule(Base):
    __tablename__ = "validation_rules"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))

    rule_type = Column(String, nullable=False)
    rule_value = Column(String, nullable=True)
    error_message = Column(String, nullable=True)

    field = relationship(
        "Field",
        back_populates="validation_rules"
    )