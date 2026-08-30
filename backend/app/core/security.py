import hashlib
import os
import secrets
import hmac
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.database.models import User, AuthSession

# OAuth2 scheme for extracting Authorization header (Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 16-byte random salt and 600,000 iterations."""
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600000)
    return f"{salt.hex()}${pwd_hash.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify raw password against PBKDF2 password hash."""
    try:
        salt_hex, hash_hex = password_hash.split("$")
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600000)
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False


def generate_token() -> str:
    """Generate cryptographically secure URL-safe 256-bit session token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of token for safe DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def get_current_user(
    header_token: Optional[str] = Depends(oauth2_scheme),
    cookie_token: Optional[str] = Cookie(None, alias="session_token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency to extract and validate the active user from session token."""
    token = header_token or cookie_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_h = hash_token(token)
    stmt = select(AuthSession).where(
        AuthSession.token_hash == token_h,
        AuthSession.expires_at > datetime.utcnow(),
    )
    res = await db.execute(stmt)
    auth_session = res.scalar_one_or_none()

    if not auth_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch User
    user_stmt = select(User).where(User.id == auth_session.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    header_token: Optional[str] = Depends(oauth2_scheme),
    cookie_token: Optional[str] = Cookie(None, alias="session_token"),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency to return current user if authenticated, else None."""
    token = header_token or cookie_token
    if not token:
        return None
    try:
        return await get_current_user(header_token=header_token, cookie_token=cookie_token, db=db)
    except HTTPException:
        return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to enforce admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user
