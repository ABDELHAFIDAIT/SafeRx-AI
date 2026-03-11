from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from backend.app.models.user import Role
from datetime import datetime


class UserBase(BaseModel) :
    first_name: str
    last_name: str
    email: EmailStr
    role: Role


class UserCreate(UserBase) :
    password: Optional[str] = None

    
class UserUpdate(BaseModel) :
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(UserBase) :
    id: int
    is_active: bool
    is_first_login: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)