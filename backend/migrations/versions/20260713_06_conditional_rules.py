"""Add conditional rules for form logic builder."""
from alembic import op
import sqlalchemy as sa

revision = "20260713_06"
down_revision = "20260707_05"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "conditional_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_id", sa.Integer(), nullable=False),
        sa.Column("trigger_field_id", sa.Integer(), nullable=False),
        sa.Column("operator", sa.String(), nullable=False),
        sa.Column("comparison_value", sa.String(length=500), nullable=True),
        sa.Column("target_field_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"]),
        sa.ForeignKeyConstraint(["target_field_id"], ["fields.id"]),
        sa.ForeignKeyConstraint(["trigger_field_id"], ["fields.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "form_id",
            "trigger_field_id",
            "operator",
            "comparison_value",
            "target_field_id",
            "action",
            name="uq_conditional_rule_identity",
        ),
    )
    op.create_index(op.f("ix_conditional_rules_id"), "conditional_rules", ["id"], unique=False)
    op.create_index(op.f("ix_conditional_rules_form_id"), "conditional_rules", ["form_id"], unique=False)
    op.create_index(op.f("ix_conditional_rules_trigger_field_id"), "conditional_rules", ["trigger_field_id"], unique=False)
    op.create_index(op.f("ix_conditional_rules_target_field_id"), "conditional_rules", ["target_field_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_conditional_rules_target_field_id"), table_name="conditional_rules")
    op.drop_index(op.f("ix_conditional_rules_trigger_field_id"), table_name="conditional_rules")
    op.drop_index(op.f("ix_conditional_rules_form_id"), table_name="conditional_rules")
    op.drop_index(op.f("ix_conditional_rules_id"), table_name="conditional_rules")
    op.drop_table("conditional_rules")
