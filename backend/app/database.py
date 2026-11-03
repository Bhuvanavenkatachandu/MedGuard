"""
MedGuard AI - Database Engine & Session Management
===================================================
Establishes database connectivity using SQLAlchemy ORM.
Features high-performance connection pooling tuned for Neon PostgreSQL serverless,
automatic storage directory creation, and a standard FastAPI session dependency.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.config import settings

# -----------------------------------------------------------------------------
# Storage Directory Initialization
# Ensure invoice PDFs and uploaded scan directories exist on startup.
# -----------------------------------------------------------------------------
os.makedirs(os.path.join(settings.STORAGE_DIR, "invoices"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "scans"), exist_ok=True)

# -----------------------------------------------------------------------------
# Engine Configuration
# -----------------------------------------------------------------------------
db_url = settings.clean_database_url
is_postgres = "postgres" in db_url.lower()

engine_kwargs = {
    "echo": False,   # Set to True for low-level SQL query logging during debugging
    "future": True,
}

if is_postgres:
    # Tuned connection pool optimized for PostgreSQL & Neon Serverless:
    # - pool_pre_ping: Validates connection health before issuing queries to recover
    #   from idle disconnects or serverless compute wakeups without 500 errors.
    # - pool_recycle: Replaces connections older than 300 seconds to prevent stale handles.
    # - pool_size & max_overflow: Provides stable baseline connections with burst headroom.
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    })
else:
    # In-memory or file-based SQLite configuration (used in isolated unit test runners)
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = StaticPool

engine = create_engine(db_url, **engine_kwargs)

# Session factory for generating isolated database transaction sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for all SQLAlchemy ORM models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides an isolated SQLAlchemy database session per request.
    
    Guarantees that the session is closed cleanly when the request cycle completes,
    returning the connection back to the pool even if an unhandled exception occurred.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
