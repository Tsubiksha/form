"""Add started_at, is_archived, archived_at to form_submissions

Revision ID: 20260728_08
Revises: 20260714_07
Create Date: 2026-07-28
"""

from alembic import op
import sqlalchemy as sa

revision = "20260728_08"
down_revision = "20260714_07"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "form_submissions",
        sa.Column("started_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "form_submissions",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "form_submissions",
        sa.Column("archived_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_form_submissions_is_archived", "form_submissions", ["is_archived"])


def downgrade():
    op.drop_index("ix_form_submissions_is_archived", table_name="form_submissions")
    op.drop_column("form_submissions", "archived_at")
    op.drop_column("form_submissions", "is_archived")
    op.drop_column("form_submissions", "started_at")
