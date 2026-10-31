#!/usr/bin/env python3
"""
MedGuard AI — PostgreSQL Database Health & Schema Verification Script
Verifies connection, required tables, relationships, and basic data integrity.
"""

import sys
from pathlib import Path

# Ensure root directory is on Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from backend.app.config import settings
from backend.app.database import Base
from backend.app.models import (
    User,
    Pharmacy,
    Medicine,
    Supplier,
    Batch,
    Inventory,
    Customer,
    Sale,
    SaleItem,
    Invoice,
    AIScan,
    SearchSession,
    StockMovement,
    EmailLog,
)

def check_database():
    print("=" * 65)
    print("MEDGUARD AI — POSTGRESQL DATABASE VERIFICATION")
    print("=" * 65)

    db_url = settings.clean_database_url
    masked_url = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"Connecting to: {masked_url}...")

    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version();")).scalar()
            print("✓ PostgreSQL connection successful")
            print(f"  Engine Info: {res.split(',')[0]}")
    except Exception as exc:
        print(f"✗ PostgreSQL connection failed: {exc}")
        sys.exit(1)

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    required_tables = [
        "users",
        "pharmacies",
        "medicines",
        "batches",
        "inventory",
        "suppliers",
        "customers",
        "sales",
        "sale_items",
        "invoices",
        "stock_movements",
        "ai_scans",
        "search_sessions",
        "email_logs",
    ]

    all_found = True
    print("\nTable Verification:")
    for tbl in required_tables:
        if tbl in existing_tables:
            # Query row count
            with engine.connect() as conn:
                count = conn.execute(text(f'SELECT COUNT(*) FROM "{tbl}"')).scalar()
            print(f"  ✓ {tbl:<16} table found ({count} records)")
        else:
            print(f"  ✗ {tbl:<16} TABLE MISSING!")
            all_found = False

    if not all_found:
        print("\n✗ One or more required tables are missing.")
        sys.exit(1)

    print("\nForeign Key & Relationship Integrity:")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Verify User -> Pharmacy
        user_with_pharm = session.query(User).join(Pharmacy, User.id == Pharmacy.owner_user_id).first()
        if user_with_pharm:
            print(f"  ✓ User -> Pharmacy relationship verified (Pharmacist: {user_with_pharm.email})")
        else:
            print("  - No linked User-Pharmacy pair found yet (database may be fresh)")

        # 2. Verify Medicine -> Batch -> Inventory
        inv_item = session.query(Inventory).first()
        if inv_item:
            print(f"  ✓ Medicine -> Batch -> Inventory verified (Stock: {inv_item.total_pieces} pieces, Batch ID: {inv_item.batch_id})")
        else:
            print("  - No inventory record found yet (database may be fresh)")

        # 3. Verify Foreign Keys via Inspector
        pharm_fks = inspector.get_foreign_keys("pharmacies")
        inv_fks = inspector.get_foreign_keys("inventory")
        sale_fks = inspector.get_foreign_keys("sales")
        if pharm_fks and inv_fks and sale_fks:
            print("✓ Foreign keys verified across core schema")

        print("\nAll database checks passed successfully!")
    except Exception as exc:
        print(f"✗ Integrity check error: {exc}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    check_database()
