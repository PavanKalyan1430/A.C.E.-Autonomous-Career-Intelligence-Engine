import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from datetime import timedelta, datetime
from jose import jwt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.core.security import get_password_hash, ALGORITHM
from app.core.config import settings

# SQLite memory database for isolated tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        yield session
        
    await engine.dispose()

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
        
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.mark.anyio
async def test_register_duplicate_integrity_handling(client: AsyncClient, db_session: AsyncSession):
    # Register the first user
    user_payload = {
        "email": "duplicate@ace.ai",
        "password": "securepassword123"
    }
    res = await client.post("/api/v1/auth/register", json=user_payload)
    assert res.status_code == 200
    
    # Try to register the same user (triggers app-level check first)
    res2 = await client.post("/api/v1/auth/register", json=user_payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

    # Explicitly bypass app check to trigger IntegrityError at db commit
    db_user = User(
        email="duplicate@ace.ai",
        hashed_password=get_password_hash("anotherpassword")
    )
    db_session.add(db_user)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

@pytest.mark.anyio
async def test_password_validation_on_register(client: AsyncClient):
    # Weak password
    res = await client.post("/api/v1/auth/register", json={
        "email": "weak@ace.ai",
        "password": "short"
    })
    assert res.status_code == 422
    assert "at least 8 characters long" in res.text

    # Extremely long password
    res2 = await client.post("/api/v1/auth/register", json={
        "email": "long@ace.ai",
        "password": "a" * 129
    })
    assert res2.status_code == 422
    assert "at most 128 characters long" in res2.text

@pytest.mark.anyio
async def test_login_flow(client: AsyncClient, db_session: AsyncSession):
    # Create user
    user = User(
        email="login_user@ace.ai",
        hashed_password=get_password_hash("validpass123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    # Success login
    login_res = await client.post("/api/v1/auth/login", data={
        "username": "login_user@ace.ai",
        "password": "validpass123"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert token_data["token_type"] == "bearer"
    assert "access_token" in token_data

    # Wrong password login
    login_res2 = await client.post("/api/v1/auth/login", data={
        "username": "login_user@ace.ai",
        "password": "wrongpassword"
    })
    assert login_res2.status_code == 400
    assert "Incorrect email or password" in login_res2.json()["detail"]

    # Nonexistent user login
    login_res3 = await client.post("/api/v1/auth/login", data={
        "username": "nonexistent@ace.ai",
        "password": "somepassword"
    })
    assert login_res3.status_code == 400
    assert "Incorrect email or password" in login_res3.json()["detail"]

@pytest.mark.anyio
async def test_jwt_validation_and_tampering(client: AsyncClient, db_session: AsyncSession):
    # Create user
    user = User(
        email="jwt_test@ace.ai",
        hashed_password=get_password_hash("pass12345"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 1. Valid token request
    login_res = await client.post("/api/v1/auth/login", data={
        "username": "jwt_test@ace.ai",
        "password": "pass12345"
    })
    token = login_res.json()["access_token"]
    
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "jwt_test@ace.ai"

    # 2. Tampered token request
    tampered_token = token + "ab"
    me_res2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert me_res2.status_code == 401
    assert "WWW-Authenticate" in me_res2.headers
    assert "Could not validate credentials" in me_res2.json()["detail"]

    # 3. Expired token request
    expired_payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    me_res3 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert me_res3.status_code == 401
    assert "WWW-Authenticate" in me_res3.headers
    assert "Could not validate credentials" in me_res3.json()["detail"]

    # 4. Nonexistent user id in token
    nonexistent_payload = {
        "sub": "99999",
        "exp": datetime.utcnow() + timedelta(minutes=10)
    }
    nonexistent_token = jwt.encode(nonexistent_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    me_res4 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {nonexistent_token}"})
    assert me_res4.status_code == 401
    assert "WWW-Authenticate" in me_res4.headers
    assert "User not found" in me_res4.json()["detail"]

@pytest.mark.anyio
async def test_inactive_user_handling(client: AsyncClient, db_session: AsyncSession):
    # Create inactive user
    user = User(
        email="inactive@ace.ai",
        hashed_password=get_password_hash("pass12345"),
        is_active=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # 1. Login should fail with 401 Unauthorized
    login_res = await client.post("/api/v1/auth/login", data={
        "username": "inactive@ace.ai",
        "password": "pass12345"
    })
    assert login_res.status_code == 401
    assert "Inactive user" in login_res.json()["detail"]

    # 2. Accessing endpoints with active-issued token after inactivation
    payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + timedelta(minutes=10)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401
    assert "WWW-Authenticate" in me_res.headers
    assert "Inactive user" in me_res.json()["detail"]

@pytest.mark.anyio
async def test_change_password_endpoint(client: AsyncClient, db_session: AsyncSession):
    # Create active user
    user = User(
        email="changepass@ace.ai",
        hashed_password=get_password_hash("oldpassword123"),
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Issue token
    payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + timedelta(minutes=10)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Change password with incorrect current password
    res_wrong = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "wrongcurrentpassword",
        "new_password": "newsecurepassword1"
    })
    assert res_wrong.status_code == 400
    assert "Incorrect current password" in res_wrong.json()["detail"]

    # 2. Change password with too short/weak new password
    res_weak = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "oldpassword123",
        "new_password": "weak"
    })
    assert res_weak.status_code == 422
    assert "at least 8 characters long" in res_weak.text

    # 3. Successful change password
    res_success = await client.post("/api/v1/auth/change-password", headers=headers, json={
        "current_password": "oldpassword123",
        "new_password": "newsecurepassword1"
    })
    assert res_success.status_code == 200
    assert "Password updated successfully" in res_success.json()["message"]

    # 4. Old password login fails
    login_old = await client.post("/api/v1/auth/login", data={
        "username": "changepass@ace.ai",
        "password": "oldpassword123"
    })
    assert login_old.status_code == 400

    # 5. New password login succeeds
    login_new = await client.post("/api/v1/auth/login", data={
        "username": "changepass@ace.ai",
        "password": "newsecurepassword1"
    })
    assert login_new.status_code == 200
