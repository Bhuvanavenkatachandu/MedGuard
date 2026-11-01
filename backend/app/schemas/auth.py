from typing import Optional
from pydantic import BaseModel, ConfigDict

class UserRegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str
    password: str
    fullName: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    mobileNumber: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str = "pharmacist"
    is_active: bool = True
    is_verified: bool = True
    pharmacy_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
