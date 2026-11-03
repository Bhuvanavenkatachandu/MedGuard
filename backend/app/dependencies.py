"""
MedGuard AI - Authentication & Dependency Injection
====================================================
Contains authentication utilities (passwords, JWT tokens) and reusable FastAPI
dependencies for securing endpoints, validating user identity, and verifying
pharmacy ownership.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.pharmacy import Pharmacy

# CryptContext configured with bcrypt algorithm for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 password bearer scheme for extracting tokens from Authorization: Bearer <token>
# auto_error=False allows us to provide clear, custom 401 error payloads
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def hash_password(password: str) -> str:
    """
    Hash a plaintext password with bcrypt.
    
    Why truncate to 72 bytes?
    The standard bcrypt specification only considers the first 72 bytes of input.
    Input exceeding 72 bytes will silently fail or raise an error in underlying
    bcrypt implementations. Truncating here provides consistent, secure hashing.
    """
    pwd_bytes = password.encode("utf-8")[:72]
    return pwd_context.hash(pwd_bytes.decode("utf-8", errors="ignore"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify whether a candidate plaintext password matches the stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return pwd_context.verify(pwd_bytes.decode("utf-8", errors="ignore"), hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JSON Web Token (JWT) with an expiration timestamp.
    
    Args:
        data: Dictionary of claims to include in the token payload (e.g., {'sub': user_id}).
        expires_delta: Optional custom lifespan for the token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a signed JWT token.
    
    Raises HTTPException(401) if the token signature is invalid, expired, or malformed.
    """
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
) -> User:
    """
    FastAPI dependency: Authenticates requests using the Bearer JWT token.
    
    Returns the authenticated active User record from the database.
    Raises HTTPException(401) if missing, invalid, or if the user is deactivated.
    """
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Pharmacy:
    """
    FastAPI dependency: Resolves the pharmacy owned by the authenticated user.
    
    Enforces Role-Based Access Control (RBAC):
    Only users with role 'pharmacist' or 'admin' can operate on pharmacy resources.
    
    Returns:
        The Pharmacy ORM object owned by the user.
    Raises:
        HTTPException(403) if the user role is not permitted.
        HTTPException(404) if the user has not completed pharmacy profile registration.
    """
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
