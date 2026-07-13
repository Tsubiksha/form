import argparse
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User, UserRole

def main():
    parser=argparse.ArgumentParser(description="Reset the FormFlow Platform Owner")
    parser.add_argument("--name",default="Platform Owner");parser.add_argument("--email",default="admin@formflow.com");parser.add_argument("--password",required=True)
    args=parser.parse_args(); db=SessionLocal()
    try:
        email=args.email.lower()
        if email!="admin@formflow.com": raise ValueError("The only administrator is admin@formflow.com")
        user=db.query(User).filter(User.email==email).first()
        if user: user.name=args.name;user.password_hash=hash_password(args.password);user.role=UserRole.ADMIN;user.is_active=True
        else: db.add(User(name=args.name,email=email,password_hash=hash_password(args.password),role=UserRole.ADMIN))
        db.query(User).filter(User.email!=email,User.role==UserRole.ADMIN).update({User.role:UserRole.USER},synchronize_session=False)
        db.commit();print(f"Administrator ready: {email}")
    finally: db.close()
if __name__=="__main__": main()
