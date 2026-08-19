import app.database.models  # Register models
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Supabase pooler requires sslmode=require or similar if configured, but typically the connection string handles it.
engine = create_engine(settings.database_url, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
