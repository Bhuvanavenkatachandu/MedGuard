"""MedGuard AI - Authentication & Dependency Injection

Contains authentication utilities (passwords, JWT tokens) and reusable FastAPI
dependencies for securing endpoints, validating user identity, and verifying
pharmacy ownership.
"""

from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.shared.config import settings
from backend.shared.database import get_db

if TYPE_CHECKING:
    from backend.features.auth.models import User
    from backend.features.pharmacy.models import Pharmacy

# CryptContext configured with bcrypt algorithm for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 password bearer scheme for extracting tokens from Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt (truncated to 72 bytes)."""
    pwd_bytes = password.encode("utf-8")[:72]
    return pwd_context.hash(pwd_bytes.decode("utf-8", errors="ignore"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify whether a candidate plaintext password matches the stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(pwd_bytes.decode("utf-8", errors="ignore"), hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JSON Web Token (JWT) with an expiration timestamp."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a signed JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """FastAPI dependency: Authenticates requests using the Bearer JWT token."""
    from backend.features.auth.models import User

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_pharmacy(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FastAPI dependency: Resolves the pharmacy owned by the authenticated user."""
    from backend.features.pharmacy.models import Pharmacy

    if current_user.role not in ["pharmacist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only pharmacists can access pharmacy administrative operations.",
        )
    pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == current_user.id).first()
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pharmacy registered for current user. Please complete pharmacy setup.",
        )
    return pharmacy


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """FastAPI dependency: Returns the authenticated User or None if unauthenticated."""
    from backend.features.auth.models import User

    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except Exception:
        return None
