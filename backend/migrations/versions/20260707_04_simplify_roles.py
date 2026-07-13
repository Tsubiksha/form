"""Collapse platform access to ADMIN and USER roles."""
from alembic import op

revision="20260707_04";down_revision="20260706_03";branch_labels=None;depends_on=None

def upgrade():
    op.execute("INSERT INTO users (name,email,password_hash,role,is_active,created_at,updated_at) VALUES ('Platform Owner','admin@formflow.com','$2b$12$invalidaccountmustbeseededbeforelogin000000000000000000','ADMIN',true,now(),now()) ON CONFLICT (email) DO NOTHING")
    op.execute("UPDATE forms SET user_id=(SELECT id FROM users WHERE email='admin@formflow.com') WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@local.' || 'invalid')")
    op.execute("UPDATE forms SET created_by=(SELECT id FROM users WHERE email='admin@formflow.com') WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@local.' || 'invalid')")
    op.execute("UPDATE forms SET updated_by=(SELECT id FROM users WHERE email='admin@formflow.com') WHERE updated_by IN (SELECT id FROM users WHERE email LIKE '%@local.' || 'invalid')")
    op.execute("DELETE FROM users WHERE email LIKE '%@local.' || 'invalid'")
    op.execute("UPDATE users SET role='ADMIN', name='Platform Owner' WHERE email='admin@formflow.com'")
    op.execute("UPDATE users SET role='USER' WHERE email<>'admin@formflow.com' AND role::text<>'USER'")
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("CREATE TYPE user_role_v2 AS ENUM ('ADMIN','USER')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role_v2 USING role::text::user_role_v2")
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_v2 RENAME TO user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'::user_role")

def downgrade():
    pass
