from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False, index=True)
    form_version_id = Column(Integer, ForeignKey("form_versions.id"), nullable=False, index=True)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    submitter_ip = Column(Text, nullable=True)
    values = relationship("SubmissionValue", back_populates="submission", cascade="all, delete-orphan")


class SubmissionValue(Base):
    __tablename__ = "submission_values"

    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("form_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id = Column(Integer, nullable=False)
    value = Column(Text, nullable=True)
    submission = relationship("FormSubmission", back_populates="values")
