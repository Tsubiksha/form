from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"
    __table_args__ = (
        UniqueConstraint("form_version_id", "idempotency_key", name="uq_submission_version_idempotency_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False, index=True)
    form_version_id = Column(Integer, ForeignKey("form_versions.id"), nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    submitter_ip = Column(Text, nullable=True)
    idempotency_key = Column(Text, nullable=True, index=True)
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    archived_at = Column(DateTime, nullable=True)
    values = relationship("SubmissionValue", back_populates="submission", cascade="all, delete-orphan")


class SubmissionValue(Base):
    __tablename__ = "submission_values"

    id = Column(Integer, primary_key=True)
    submission_id = Column(Integer, ForeignKey("form_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id = Column(Integer, nullable=False)
    value = Column(Text, nullable=True)
    submission = relationship("FormSubmission", back_populates="values")
