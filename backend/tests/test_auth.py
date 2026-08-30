import uuid
import pytest
from app.database.session import init_db, async_session_factory
from app.core.security import hash_password, verify_password, generate_token, hash_token
from app.database.models import User, AuthSession, Task, Conversation, Memory, Document
from app.models.schemas import RegisterRequest, LoginRequest
from sqlalchemy import select


@pytest.mark.asyncio
async def test_password_hashing():
    pwd = "CyberpunkPassword123!"
    h = hash_password(pwd)
    assert h != pwd
    assert "$" in h
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False


@pytest.mark.asyncio
async def test_session_token_generation():
    token = generate_token()
    assert len(token) >= 32
    h1 = hash_token(token)
    h2 = hash_token(token)
    assert h1 == h2
    assert len(h1) == 64


@pytest.mark.asyncio
async def test_user_creation_and_isolation():
    await init_db()

    uname_a = f"test_user_a_{uuid.uuid4().hex[:8]}"
    uname_b = f"test_user_b_{uuid.uuid4().hex[:8]}"

    async with async_session_factory() as session:
        user_a = User(username=uname_a, password_hash=hash_password("pass_a"), role="admin")
        user_b = User(username=uname_b, password_hash=hash_password("pass_b"), role="user")
        session.add_all([user_a, user_b])
        await session.commit()
        await session.refresh(user_a)
        await session.refresh(user_b)

        # Create tasks for user_a and user_b
        task_a = Task(title="User A Secret Task", user_id=user_a.id)
        task_b = Task(title="User B Secret Task", user_id=user_b.id)
        session.add_all([task_a, task_b])
        await session.commit()

        # Query User A tasks
        stmt_a = select(Task).where(Task.user_id == user_a.id)
        res_a = await session.execute(stmt_a)
        tasks_a = res_a.scalars().all()
        assert len(tasks_a) == 1
        assert tasks_a[0].title == "User A Secret Task"

        # Query User B tasks
        stmt_b = select(Task).where(Task.user_id == user_b.id)
        res_b = await session.execute(stmt_b)
        tasks_b = res_b.scalars().all()
        assert len(tasks_b) == 1
        assert tasks_b[0].title == "User B Secret Task"
