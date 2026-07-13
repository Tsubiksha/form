import os
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.user import User, UserRole

def seed_admin(db:Session):
    email=os.getenv("DEFAULT_ADMIN_EMAIL");password=os.getenv("DEFAULT_ADMIN_PASSWORD");name=os.getenv("DEFAULT_ADMIN_NAME","Platform Owner")
    if not email or not password: return
    if len(password)<6 or not password.isascii() or not password.isalnum():
        raise RuntimeError("DEFAULT_ADMIN_PASSWORD must be 6-72 letters and numbers only")
    canonical_email=email.lower();user=db.query(User).filter(User.email==canonical_email).first()
    if not user: user=User(email=canonical_email);db.add(user)
    user.name=name;user.password_hash=hash_password(password);user.role=UserRole.ADMIN;user.is_active=True
    db.query(User).filter(User.id!=user.id,User.role==UserRole.ADMIN).update({User.role:UserRole.USER},synchronize_session=False)
    db.commit()
