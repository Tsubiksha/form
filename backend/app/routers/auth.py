from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_password, hash_token, verify_password
from app.db.database import get_db
from app.models.user import RefreshToken, User, UserRole
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LogoutRequest, ProfileUpdateRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def token_response(user: User, db: Session) -> TokenResponse:
    raw, token_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    return TokenResponse(access_token=create_access_token(user.id, role), refresh_token=raw, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role=UserRole.USER)
    db.add(user)
    db.commit()
    db.refresh(user)
    return token_response(user, db)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    user.last_login_at = datetime.utcnow()
    db.commit(); db.refresh(user)
    return token_response(user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.refresh_token:
        token = db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.token_hash == hash_token(payload.refresh_token)).first()
        if token:
            token.revoked_at = datetime.utcnow()
            db.commit()
    return None


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
def update_profile(payload: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email=payload.email.lower() if payload.email else user.email
    existing=db.query(User).filter(User.email==email,User.id!=user.id).first()
    if existing: raise HTTPException(status_code=409,detail="An account with this email already exists")
    user.name = payload.name.strip()
    user.email = email
    db.commit(); db.refresh(user)
    return user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")
    user.password_hash = hash_password(payload.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)).update({"revoked_at": datetime.utcnow()})
    db.commit()
    return None
