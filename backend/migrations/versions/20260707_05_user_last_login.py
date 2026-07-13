"""Track the most recent successful user login."""
from alembic import op
import sqlalchemy as sa

revision="20260707_05";down_revision="20260707_04";branch_labels=None;depends_on=None

def upgrade():
    op.add_column("users",sa.Column("last_login_at",sa.DateTime(),nullable=True))

def downgrade():
    op.drop_column("users","last_login_at")
