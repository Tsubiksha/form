"""Cascade conditional rules on field delete and add submission idempotency."""
from alembic import op
import sqlalchemy as sa

revision = "20260714_07"
down_revision = "20260713_06"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("conditional_rules_trigger_field_id_fkey", "conditional_rules", type_="foreignkey")
    op.drop_constraint("conditional_rules_target_field_id_fkey", "conditional_rules", type_="foreignkey")
    op.create_foreign_key(
        "conditional_rules_trigger_field_id_fkey",
        "conditional_rules",
        "fields",
        ["trigger_field_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "conditional_rules_target_field_id_fkey",
        "conditional_rules",
        "fields",
        ["target_field_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.add_column("form_submissions", sa.Column("idempotency_key", sa.Text(), nullable=True))
    op.create_index(op.f("ix_form_submissions_idempotency_key"), "form_submissions", ["idempotency_key"], unique=False)
    op.create_unique_constraint(
        "uq_submission_version_idempotency_key",
        "form_submissions",
        ["form_version_id", "idempotency_key"],
    )


def downgrade():
    op.drop_constraint("uq_submission_version_idempotency_key", "form_submissions", type_="unique")
    op.drop_index(op.f("ix_form_submissions_idempotency_key"), table_name="form_submissions")
    op.drop_column("form_submissions", "idempotency_key")
    op.drop_constraint("conditional_rules_trigger_field_id_fkey", "conditional_rules", type_="foreignkey")
    op.drop_constraint("conditional_rules_target_field_id_fkey", "conditional_rules", type_="foreignkey")
    op.create_foreign_key(
        "conditional_rules_trigger_field_id_fkey",
        "conditional_rules",
        "fields",
        ["trigger_field_id"],
        ["id"],
    )
    op.create_foreign_key(
        "conditional_rules_target_field_id_fkey",
        "conditional_rules",
        "fields",
        ["target_field_id"],
        ["id"],
    )
