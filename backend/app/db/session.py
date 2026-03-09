from backend.app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)