import sys
import os

# Bootstrap path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.user import User
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.export_job import ExportJob
from app.models.audit_log import AuditLog

def migrate_data():
    db = SessionLocal()
    try:
        target_email = "thangavelsubiksha81@gmail.com"

        target_user = db.query(User).filter_by(email=target_email).first()
        if not target_user:
            # Create target user with admin role if missing
            from app.core.security import get_password_hash
            target_user = User(
                email=target_email,
                name="Subiksha Thangavel",
                hashed_password=get_password_hash("Password123!"),
                role="admin",
                is_active=True
            )
            db.add(target_user)
            db.flush()
            print(f"Created target user '{target_email}' (ID: {target_user.id})")

        target_id = target_user.id

        # Migrate ALL Forms not owned by target user
        forms = db.query(Form).filter(Form.user_id != target_id).all()
        for f in forms:
            f.user_id = target_id
            f.created_by = target_id
            f.updated_by = target_id
        print(f"Migrated {len(forms)} forms to {target_email}.")

        # Migrate Form Versions
        versions = db.query(FormVersion).filter(FormVersion.created_by != target_id).all()
        for v in versions:
            v.created_by = target_id
        print(f"Migrated {len(versions)} form versions.")

        # Migrate Export Jobs
        exports = db.query(ExportJob).filter(ExportJob.user_id != target_id).all()
        for e in exports:
            e.user_id = target_id
        print(f"Migrated {len(exports)} export jobs.")

        # Migrate Audit Logs
        logs = db.query(AuditLog).filter(AuditLog.user_id != target_id).all()
        for l in logs:
            l.user_id = target_id
        print(f"Migrated {len(logs)} audit logs.")

        db.commit()
        print("Data migration completed successfully!")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()
