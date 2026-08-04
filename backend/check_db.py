import sys
from app.db.database import SessionLocal
from app.models.user import User
from app.models.form import Form
db = SessionLocal()
users = db.query(User).all()
forms = db.query(Form).all()

with open('db_status.txt', 'w', encoding='utf-8') as f:
    f.write(f"Users ({len(users)}):\n")
    for u in users:
        f.write(f" - {u.id}: {u.email} (active: {u.is_active})\n")
    
    f.write(f"\nForms ({len(forms)}):\n")
    for frm in forms:
        f.write(f" - {frm.id}: {frm.title} (owner_id: {frm.user_id})\n")
