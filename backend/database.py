# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# We use SQLite for local development. In production, this would be a PostgreSQL URL.
SQLALCHEMY_DATABASE_URL = "sqlite:///./huddle.db"

# connect_args={"check_same_thread": False} is required only for SQLite in FastAPI
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get a database session for our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()