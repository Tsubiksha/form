"""Phase 2 SaaS foundation and immutable submissions."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision="20260706_01"; down_revision=None; branch_labels=None; depends_on=None

def upgrade():
    role=postgresql.ENUM("ADMIN","USER",name="user_role",create_type=False); role.create(op.get_bind(),checkfirst=True)
    op.create_table("users",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("name",sa.String(120),nullable=False),sa.Column("email",sa.String(320),nullable=False),sa.Column("password_hash",sa.String(255),nullable=False),sa.Column("role",role,nullable=False,server_default="USER"),sa.Column("is_active",sa.Boolean(),nullable=False,server_default=sa.true()),sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(),nullable=False,server_default=sa.func.now()),sa.UniqueConstraint("email"))
    op.create_index("ix_users_email","users",["email"],unique=True)
    op.execute("INSERT INTO users (name,email,password_hash,role) VALUES ('Platform Owner','admin@formflow.com','$2b$12$invalidaccountmustbeseededbeforelogin000000000000000000','ADMIN')")
    op.add_column("forms",sa.Column("user_id",sa.Integer(),nullable=True)); op.add_column("forms",sa.Column("status",sa.String(),nullable=False,server_default="draft")); op.add_column("forms",sa.Column("is_deleted",sa.Boolean(),nullable=False,server_default=sa.false())); op.add_column("forms",sa.Column("created_by",sa.Integer(),nullable=True)); op.add_column("forms",sa.Column("updated_by",sa.Integer(),nullable=True)); op.add_column("forms",sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now())); op.add_column("forms",sa.Column("updated_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    op.execute("UPDATE forms SET user_id=(SELECT id FROM users WHERE email='admin@formflow.com'), created_by=(SELECT id FROM users WHERE email='admin@formflow.com')")
    op.alter_column("forms","user_id",nullable=False); op.create_foreign_key("fk_forms_user","forms","users",["user_id"],["id"]); op.create_foreign_key("fk_forms_created_by","forms","users",["created_by"],["id"]); op.create_foreign_key("fk_forms_updated_by","forms","users",["updated_by"],["id"]); op.create_index("ix_forms_user_id","forms",["user_id"]); op.create_index("ix_forms_status","forms",["status"]); op.create_index("ix_forms_is_deleted","forms",["is_deleted"])
    op.add_column("field_options",sa.Column("display_order",sa.Integer(),nullable=False,server_default="0")); op.add_column("form_versions",sa.Column("snapshot",sa.JSON(),nullable=False,server_default=sa.text("'{}'::json"))); op.add_column("share_links",sa.Column("is_active",sa.Boolean(),nullable=False,server_default=sa.true())); op.add_column("share_links",sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    op.create_table("refresh_tokens",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("user_id",sa.Integer(),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("token_hash",sa.String(64),nullable=False,unique=True),sa.Column("expires_at",sa.DateTime(),nullable=False),sa.Column("revoked_at",sa.DateTime()),sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    op.create_table("form_submissions",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("form_id",sa.Integer(),sa.ForeignKey("forms.id"),nullable=False),sa.Column("form_version_id",sa.Integer(),sa.ForeignKey("form_versions.id"),nullable=False),sa.Column("submitted_at",sa.DateTime(),nullable=False,server_default=sa.func.now()),sa.Column("submitter_ip",sa.Text()))
    op.create_table("submission_values",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("submission_id",sa.Integer(),sa.ForeignKey("form_submissions.id",ondelete="CASCADE"),nullable=False),sa.Column("field_id",sa.Integer(),nullable=False),sa.Column("value",sa.Text()))
    op.create_table("audit_logs",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("user_id",sa.Integer()),sa.Column("action",sa.String(80),nullable=False),sa.Column("entity_type",sa.String(80),nullable=False),sa.Column("entity_id",sa.Integer()),sa.Column("details",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    op.create_index("ix_refresh_tokens_user_id","refresh_tokens",["user_id"]); op.create_index("ix_refresh_tokens_token_hash","refresh_tokens",["token_hash"],unique=True)
    op.create_index("ix_submissions_form_id","form_submissions",["form_id"]); op.create_index("ix_submissions_version_id","form_submissions",["form_version_id"]); op.create_index("ix_submissions_submitted_at","form_submissions",["submitted_at"])
    op.create_index("ix_submission_values_submission_id","submission_values",["submission_id"]); op.create_index("ix_audit_logs_created_at","audit_logs",["created_at"]); op.create_index("ix_audit_logs_action","audit_logs",["action"])

def downgrade():
    for table,name in [("audit_logs","ix_audit_logs_action"),("audit_logs","ix_audit_logs_created_at"),("submission_values","ix_submission_values_submission_id"),("form_submissions","ix_submissions_submitted_at"),("form_submissions","ix_submissions_version_id"),("form_submissions","ix_submissions_form_id"),("refresh_tokens","ix_refresh_tokens_token_hash"),("refresh_tokens","ix_refresh_tokens_user_id")]: op.drop_index(name,table_name=table)
    op.drop_table("audit_logs"); op.drop_table("submission_values"); op.drop_table("form_submissions"); op.drop_table("refresh_tokens")
    for table,column in [("share_links","created_at"),("share_links","is_active"),("form_versions","snapshot"),("field_options","display_order")]: op.drop_column(table,column)
    for name in ["fk_forms_updated_by","fk_forms_created_by","fk_forms_user"]: op.drop_constraint(name,"forms",type_="foreignkey")
    for column in ["updated_at","created_at","updated_by","created_by","is_deleted","status","user_id"]: op.drop_column("forms",column)
    op.drop_table("users"); postgresql.ENUM(name="user_role").drop(op.get_bind(),checkfirst=True)
