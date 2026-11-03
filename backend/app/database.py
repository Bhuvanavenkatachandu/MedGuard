"""MedGuard AI - Backward-Compatible Database Bridge.

Re-exports database engine, session, Base, and get_db from backend.shared.database.
"""

from backend.shared.database import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
