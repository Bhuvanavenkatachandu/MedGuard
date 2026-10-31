import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Ensure storage directories exist
os.makedirs(os.path.join(settings.STORAGE_DIR, "invoices"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "scans"), exist_ok=True)

db_url = settings.clean_database_url
is_postgres = "postgres" in db_url.lower()

engine_kwargs = {
    "echo": False,
    "future": True,
}

if is_postgres:
    # High-performance connection pool optimized for PostgreSQL & Neon serverless
    engine_kwargs.update({
        "pool_pre_ping": True,     # Automatic ping to catch dropped/idled Neon connections
        "pool_recycle": 300,       # Recycle connections every 5 minutes
        "pool_size": 10,           # Persistent connection pool
        "max_overflow": 20,        # Burst headroom
    })
else:
    # Fallback only for isolated in-memory test suites if needed
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
