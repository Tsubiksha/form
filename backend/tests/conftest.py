import os
os.environ["DATABASE_URL"]="sqlite://"
os.environ["JWT_SECRET"]="test-secret-at-least-thirty-two-bytes-long"
os.environ["TESTING"]="true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import create_access_token, hash_password

engine=create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
TestingSession=sessionmaker(bind=engine,autocommit=False,autoflush=False)

@pytest.fixture(autouse=True)
def database():
    Base.metadata.create_all(engine); yield; Base.metadata.drop_all(engine)

@pytest.fixture
def client():
    def override():
        db=TestingSession()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db]=override
    with TestClient(app) as c: yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth(client):
    response=client.post("/auth/register",json={"name":"Test User","email":"test@example.com","password":"Password1"})
    assert response.status_code==201
    return {"Authorization":f"Bearer {response.json()['access_token']}"}

@pytest.fixture
def admin_auth():
    db=TestingSession();user=User(name="Platform Owner",email="admin@formflow.com",password_hash=hash_password("Admin123"),role=UserRole.ADMIN);db.add(user);db.commit();db.refresh(user);token=create_access_token(user.id,user.role.value);db.close();return {"Authorization":f"Bearer {token}"}
