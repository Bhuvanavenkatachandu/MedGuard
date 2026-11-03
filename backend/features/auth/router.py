"""MedGuard AI - Authentication Router (Auth Feature)"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.auth.schemas import UserRegisterRequest, UserLoginRequest, UserOut, TokenResponse
from backend.features.auth.service import register_user, login_user, get_user_out, refresh_token
from backend.shared.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new pharmacist user and return JWT access token."""
    return register_user(db, req)


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive JWT access token."""
    return login_user(db, req)


@router.get("/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)):
    """Fetch profile information for the authenticated user."""
    return get_user_out(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(current_user=Depends(get_current_user)):
    """Refresh access token for current active user."""
    return refresh_token(current_user)
