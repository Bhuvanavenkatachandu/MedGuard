"""MedGuard AI - Authentication Service (Auth Feature)"""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.features.auth.models import User
from backend.features.auth.schemas import UserRegisterRequest, UserLoginRequest, UserOut, TokenResponse
from backend.shared.auth.dependencies import hash_password, verify_password, create_access_token


def register_user(db: Session, req: UserRegisterRequest) -> TokenResponse:
    """Registers a new pharmacist user account."""
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists. Please log in.",
        )

    user_name = (
        (req.fullName and req.fullName.strip())
        or (req.name and req.name.strip())
        or req.email.split("@")[0].replace(".", " ").title()
    )
    user_phone = (
        (req.phone and req.phone.strip())
        or (req.mobileNumber and req.mobileNumber.strip())
        or None
    )

    new_user = User(
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        name=user_name,
        phone=user_phone,
        role="pharmacist",
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role})
    user_out = get_user_out(new_user)
    return TokenResponse(access_token=token, user=user_out)


def login_user(db: Session, req: UserLoginRequest) -> TokenResponse:
    """Validates user credentials and issues a signed JWT access token."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    user_out = get_user_out(user)
    return TokenResponse(access_token=token, user=user_out)


def get_user_out(user: User) -> UserOut:
    """Converts a User ORM instance into UserOut schema."""
    pharmacy_id = user.pharmacy.id if user.pharmacy else None
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        pharmacy_id=pharmacy_id,
    )


def refresh_token(user: User) -> TokenResponse:
    """Re-issues a fresh access token for an authenticated active user."""
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(access_token=token, user=get_user_out(user))
