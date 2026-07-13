from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class FieldOption(Base):
    __tablename__ = "field_options"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    option_label = Column(String, nullable=False)
    option_value = Column(String, nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    field = relationship("Field", back_populates="options")
