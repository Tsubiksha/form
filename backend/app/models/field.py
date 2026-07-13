from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"))

    label = Column(String, nullable=False)
    field_type = Column(String, nullable=False)

    required = Column(Boolean, default=False)
    placeholder = Column(String, nullable=True)
    help_text = Column(String, nullable=True)
    display_order = Column(Integer, default=0)

    form = relationship("Form", back_populates="fields")

    validation_rules = relationship(
        "ValidationRule",
        back_populates="field",
        cascade="all, delete-orphan"
    )
    options = relationship("FieldOption", back_populates="field", order_by="FieldOption.display_order", cascade="all, delete-orphan")
