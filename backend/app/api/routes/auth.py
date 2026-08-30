import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database.session import get_db
from app.database.models import User, AuthSession
from app.models.schemas import (
    RegisterRequest,
    LoginRequest,
    UserRead,
    AuthResponse,
)
from app.core.security import (
    hash_password,
    verify_password,
    generate_token,
    hash_token,
    get_current_user,
    oauth2_scheme,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def get_auth_status(db: AsyncSession = Depends(get_db)):
    """Check whether initial system setup (first user creation) is completed."""
    stmt = select(func.count(User.id))
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return {
        "is_setup_completed": count > 0,
        "total_users": count,
    }


@router.post("/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account. The first registered user automatically becomes Admin."""
    username = payload.username.strip()
    if len(username) < 3:
        raise HTTPException(
            status_code=400, detail="Username must be at least 3 characters long"
        )
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters long"
        )

    # Check if username exists
    existing_stmt = select(User).where(User.username == username)
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail="Username is already taken"
        )

    # Count existing users to determine role
    count_stmt = select(func.count(User.id))
    count_res = await db.execute(count_stmt)
    user_count = count_res.scalar() or 0

    is_first_user = user_count == 0
    assigned_role = "admin" if is_first_user else "user"

    # Create User
    new_user = User(
        username=username,
        password_hash=hash_password(payload.password),
        role=assigned_role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Create Session Token
    raw_token = generate_token()
    session_obj = AuthSession(
        user_id=new_user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(session_obj)
    await db.commit()

    # Set cookie
    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
    )

    return AuthResponse(
        user=UserRead.model_validate(new_user),
        token=raw_token,
        is_first_user=is_first_user,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user credentials and issue a session token."""
    username = payload.username.strip()
    stmt = select(User).where(User.username == username)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Generate Session Token
    raw_token = generate_token()
    session_obj = AuthSession(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(session_obj)
    await db.commit()

    # Set Cookie
    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
    )

    return AuthResponse(
        user=UserRead.model_validate(user),
        token=raw_token,
        is_first_user=False,
    )


@router.post("/logout")
async def logout(
    response: Response,
    header_token: Optional[str] = Depends(oauth2_scheme),
    cookie_token: Optional[str] = Cookie(None, alias="session_token"),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate active session token and clear authentication cookie."""
    token = header_token or cookie_token
    if token:
        token_h = hash_token(token)
        stmt = delete(AuthSession).where(AuthSession.token_hash == token_h)
        await db.execute(stmt)
        await db.commit()

    response.delete_cookie(key="session_token")
    return {"success": True}


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    """Fetch currently authenticated user profile."""
    return UserRead.model_validate(current_user)
