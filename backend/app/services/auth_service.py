from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserOut, TokenResponse
from backend.app.dependencies import hash_password, verify_password, create_access_token

def register_user(db: Session, req: UserRegisterRequest) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists. Please log in.",
        )

    new_user = User(
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        name=req.fullName.strip(),
        phone=req.phone.strip() if req.phone else None,
        role="pharmacist",
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    user_out = UserOut(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        phone=new_user.phone,
        role=new_user.role,
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        pharmacy_id=None,
    )
    return TokenResponse(access_token=access_token, user=user_out)

def login_user(db: Session, req: UserLoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == user.id).first()
    pharmacy_id = pharmacy.id if pharmacy else None

    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    user_out = UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        pharmacy_id=pharmacy_id,
    )
    return TokenResponse(access_token=access_token, user=user_out)

def get_user_out(db: Session, user: User) -> UserOut:
    pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == user.id).first()
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        pharmacy_id=pharmacy.id if pharmacy else None,
    )
