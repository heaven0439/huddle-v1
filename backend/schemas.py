# backend/schemas.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class MeetingCreateResponse(BaseModel):
    room_code: str
    host_id: int
    created_at: datetime
    
    # This single line fixes the backend crash!
    class Config:
        from_attributes = True

# Add to the bottom of backend/schemas.py
class GoogleAuthRequest(BaseModel):
    token: str       