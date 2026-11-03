"""MedGuard AI - Database Engine & Session Management

Establishes database connectivity using SQLAlchemy ORM.
Features high-performance connection pooling tuned for Neon PostgreSQL serverless,
automatic storage directory creation, and a standard FastAPI session dependency.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
from backend.shared.config import settings

# Storage Directory Initialization
os.makedirs(os.path.join(settings.STORAGE_DIR, "invoices"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "scans"), exist_ok=True)

# Engine Configuration
db_url = settings.clean_database_url
is_postgres = "postgres" in db_url.lower()

engine_kwargs = {
    "echo": False,
    "future": True,
}

if is_postgres:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    })
else:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: provides an isolated SQLAlchemy database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
