# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import uuid

# NEW: Firebase Imports
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

import models
import schemas
import auth
from database import engine, get_db
from signaling import manager

# Auto-create SQLite database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Huddle API")

# NEW: Initialize Firebase Admin SDK
try:
    # This tells Python to look for the key file you downloaded from Firebase
    cred = credentials.Certificate("firebase-credentials.json")
    firebase_admin.initialize_app(cred)
except ValueError:
    # Prevents crashing if Firebase is already initialized during a reload
    pass
except FileNotFoundError:
    print("WARNING: firebase-credentials.json not found. Google Auth will fail.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

# --- AUTHENTICATION ROUTES ---
@app.post("/api/auth/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, password_hash=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

# NEW: GOOGLE AUTH ROUTE
@app.post("/api/auth/google", response_model=schemas.Token)
def google_auth(request: schemas.GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # 1. Ask Google/Firebase to verify the token is authentic
        # 1. Ask Google/Firebase to verify the token is authentic
        decoded_token = firebase_auth.verify_id_token(request.token, clock_skew_seconds=60)
        email = decoded_token.get("email")
        name = decoded_token.get("name", "Google User")
        
        # 2. Check if this user exists in our local SQLite database
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            # 3. If new user, create an account automatically.
            # We assign a random secure string as the password since they use Google to log in.
            random_password = uuid.uuid4().hex
            hashed_pwd = auth.get_password_hash(random_password)
            
            user = models.User(name=name, email=email, password_hash=hashed_pwd)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # 4. Generate our standard Huddle JWT token and let them into the dashboard
        access_token = auth.create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid Google Authentication: {str(e)}"
        )

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- MEETING ROUTES ---
def generate_room_code():
    """Generates a random 10-character code formatted as xxx-xxxx-xxx"""
    uid = uuid.uuid4().hex
    return f"{uid[:3]}-{uid[3:7]}-{uid[7:10]}"

@app.post("/api/meetings/create", response_model=schemas.MeetingCreateResponse)
def create_meeting(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Creates a new meeting in the database owned by the current user."""
    code = generate_room_code()
    
    new_meeting = models.Meeting(room_code=code, host_id=current_user.id)
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    
    return new_meeting

# --- WEBSOCKET SIGNALING ROUTE ---
@app.websocket("/ws/{room_code}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, client_id: str):
    await manager.connect(websocket, room_code)
    
    await manager.broadcast_to_room(
        {"type": "user-joined", "client_id": client_id},
        room_code=room_code,
        sender=websocket
    )
    
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast_to_room(
                data,
                room_code=room_code,
                sender=websocket
            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)
        await manager.broadcast_to_room(
            {"type": "user-left", "client_id": client_id},
            room_code=room_code
        )