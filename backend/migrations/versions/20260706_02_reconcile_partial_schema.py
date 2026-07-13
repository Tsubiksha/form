"""Reconcile databases previously initialized with SQLAlchemy create_all."""
from alembic import op
import sqlalchemy as sa

revision="20260706_02"; down_revision="20260706_01"; branch_labels=None; depends_on=None

def columns(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}

def constraints(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_foreign_keys(table)}

def indexes(table):
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)}

def upgrade():
    form_cols=columns("forms")
    if "user_id" not in form_cols: op.add_column("forms",sa.Column("user_id",sa.Integer(),nullable=True))
    if "status" not in form_cols: op.add_column("forms",sa.Column("status",sa.String(),nullable=False,server_default="draft"))
    if "is_deleted" not in form_cols: op.add_column("forms",sa.Column("is_deleted",sa.Boolean(),nullable=False,server_default=sa.false()))
    if "created_by" not in form_cols: op.add_column("forms",sa.Column("created_by",sa.Integer(),nullable=True))
    if "updated_by" not in form_cols: op.add_column("forms",sa.Column("updated_by",sa.Integer(),nullable=True))
    if "created_at" not in form_cols: op.add_column("forms",sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    if "updated_at" not in form_cols: op.add_column("forms",sa.Column("updated_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))
    op.execute("INSERT INTO users (name,email,password_hash,role,is_active,created_at,updated_at) VALUES ('Platform Owner','admin@formflow.com','$2b$12$invalidaccountmustbeseededbeforelogin000000000000000000','ADMIN',true,now(),now()) ON CONFLICT (email) DO NOTHING")
    op.execute("UPDATE forms SET user_id=(SELECT id FROM users WHERE email='admin@formflow.com') WHERE user_id IS NULL")
    op.execute("UPDATE forms SET created_by=user_id WHERE created_by IS NULL")
    op.alter_column("forms","user_id",nullable=False)
    fks=constraints("forms")
    if "fk_forms_user" not in fks: op.create_foreign_key("fk_forms_user","forms","users",["user_id"],["id"])
    if "fk_forms_created_by" not in fks: op.create_foreign_key("fk_forms_created_by","forms","users",["created_by"],["id"])
    if "fk_forms_updated_by" not in fks: op.create_foreign_key("fk_forms_updated_by","forms","users",["updated_by"],["id"])
    form_indexes=indexes("forms")
    if "ix_forms_user_id" not in form_indexes: op.create_index("ix_forms_user_id","forms",["user_id"])
    if "ix_forms_status" not in form_indexes: op.create_index("ix_forms_status","forms",["status"])
    if "ix_forms_is_deleted" not in form_indexes: op.create_index("ix_forms_is_deleted","forms",["is_deleted"])
    if "display_order" not in columns("field_options"): op.add_column("field_options",sa.Column("display_order",sa.Integer(),nullable=False,server_default="0"))
    if "snapshot" not in columns("form_versions"): op.add_column("form_versions",sa.Column("snapshot",sa.JSON(),nullable=False,server_default=sa.text("'{}'::json")))
    share_cols=columns("share_links")
    if "is_active" not in share_cols: op.add_column("share_links",sa.Column("is_active",sa.Boolean(),nullable=False,server_default=sa.true()))
    if "created_at" not in share_cols: op.add_column("share_links",sa.Column("created_at",sa.DateTime(),nullable=False,server_default=sa.func.now()))

def downgrade():
    # This reconciliation intentionally has no destructive downgrade.
    pass
