#!/usr/bin/env python3
"""
MedGuard AI — SQLite3 to PostgreSQL / Neon Database Migration Script
Transfers all tables, foreign keys, timestamps, JSON, and inventory from SQLite to PostgreSQL.
"""

import os
import sys
import json
import sqlite3
import argparse
from datetime import datetime, date
from pathlib import Path

# Ensure root directory is on Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine
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

def parse_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        clean = val.replace("T", " ")
        if "." in clean:
            return datetime.strptime(clean, "%Y-%m-%d %H:%M:%S.%f")
        return datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            return datetime.fromisoformat(val)
        except Exception:
            return datetime.utcnow()

def parse_date(val):
    if not val:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    try:
        clean = val.split(" ")[0].split("T")[0]
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except Exception:
        return date.today()

def parse_json(val):
    if not val:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {"raw": str(val)}

def migrate(sqlite_path: str, pg_url: str):
    print("=" * 65)
    print("MEDGUARD AI — SQLITE3 TO POSTGRESQL MIGRATION")
    print("=" * 65)

    if not os.path.exists(sqlite_path):
        print(f"Error: SQLite database file not found at: {sqlite_path}")
        sys.exit(1)

    print(f"Source SQLite:     {sqlite_path}")
    print(f"Target PostgreSQL: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")

    # 1. Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 2. Connect to PostgreSQL
    pg_engine = create_engine(
        pg_url,
        pool_pre_ping=True,
        echo=False,
    )
    Base.metadata.create_all(bind=pg_engine)
    Session = sessionmaker(bind=pg_engine)
    pg_db = Session()

    summary = {}
    errors = []

    # Ordered table migrations
    table_pipeline = [
        ("users", User, [
            ("id", str),
            ("email", str),
            ("password_hash", str),
            ("name", str),
            ("phone", str),
            ("role", str),
            ("is_active", bool),
            ("is_verified", bool),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("search_sessions", SearchSession, [
            ("id", str),
            ("session_token", str),
            ("search_query", str),
            ("user_lat", float),
            ("user_lng", float),
            ("results_count", int),
            ("created_at", parse_datetime),
        ]),
        ("pharmacies", Pharmacy, [
            ("id", str),
            ("owner_user_id", str),
            ("name", str),
            ("owner_name", str),
            ("phone", str),
            ("email", str),
            ("address", str),
            ("city", str),
            ("state", str),
            ("pincode", str),
            ("latitude", float),
            ("longitude", float),
            ("license_number", str),
            ("near_expiry_threshold_days", int),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("suppliers", Supplier, [
            ("id", str),
            ("pharmacy_id", str),
            ("name", str),
            ("contact_person", str),
            ("phone", str),
            ("email", str),
            ("address", str),
            ("gst_number", str),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("customers", Customer, [
            ("id", str),
            ("pharmacy_id", str),
            ("name", str),
            ("phone", str),
            ("email", str),
            ("address", str),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("medicines", Medicine, [
            ("id", str),
            ("pharmacy_id", str),
            ("name", str),
            ("generic_name", str),
            ("brand", str),
            ("strength", str),
            ("category", str),
            ("manufacturer", str),
            ("pieces_per_strip", int),
            ("unit_of_measure", str),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("batches", Batch, [
            ("id", str),
            ("pharmacy_id", str),
            ("medicine_id", str),
            ("supplier_id", str),
            ("batch_number", str),
            ("manufacturing_date", parse_date),
            ("expiry_date", parse_date),
            ("mrp_per_strip", float),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("inventory", Inventory, [
            ("id", str),
            ("pharmacy_id", str),
            ("medicine_id", str),
            ("batch_id", str),
            ("pieces_per_strip", int),
            ("total_pieces", int),
            ("price_per_piece", float),
            ("price_per_strip", float),
            ("min_stock_pieces", int),
            ("created_at", parse_datetime),
            ("updated_at", parse_datetime),
        ]),
        ("sales", Sale, [
            ("id", str),
            ("pharmacy_id", str),
            ("customer_id", str),
            ("pharmacist_id", str),
            ("sale_number", str),
            ("subtotal", float),
            ("discount_amount", float),
            ("tax_amount", float),
            ("total_amount", float),
            ("payment_method", str),
            ("notes", str),
            ("created_at", parse_datetime),
        ]),
        ("sale_items", SaleItem, [
            ("id", str),
            ("sale_id", str),
            ("medicine_id", str),
            ("batch_id", str),
            ("unit_type", str),
            ("quantity_units", int),
            ("pieces_count", int),
            ("unit_price", float),
            ("total_price", float),
            ("created_at", parse_datetime),
        ]),
        ("invoices", Invoice, [
            ("id", str),
            ("pharmacy_id", str),
            ("sale_id", str),
            ("invoice_number", str),
            ("customer_name", str),
            ("customer_phone", str),
            ("customer_email", str),
            ("total_amount", float),
            ("pdf_url", str),
            ("status", str),
            ("created_at", parse_datetime),
        ]),
        ("stock_movements", StockMovement, [
            ("id", str),
            ("pharmacy_id", str),
            ("medicine_id", str),
            ("batch_id", str),
            ("movement_type", str),
            ("pieces_quantity", int),
            ("balance_after", int),
            ("reference_id", str),
            ("notes", str),
            ("created_at", parse_datetime),
        ]),
        ("ai_scans", AIScan, [
            ("id", str),
            ("pharmacy_id", str),
            ("image_url", str),
            ("raw_response", str),
            ("extracted_data", parse_json),
            ("confidence_score", float),
            ("status", str),
            ("error_message", str),
            ("created_at", parse_datetime),
        ]),
        ("email_logs", EmailLog, [
            ("id", str),
            ("pharmacy_id", str),
            ("invoice_id", str),
            ("recipient_email", str),
            ("status", str),
            ("error_message", str),
            ("resend_id", str),
            ("created_at", parse_datetime),
        ]),
    ]

    for table_name, model_class, field_specs in table_pipeline:
        try:
            sqlite_cur.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cur.fetchall()
        except sqlite3.OperationalError:
            print(f"Table '{table_name}' does not exist in SQLite source. Skipping.")
            continue

        migrated_count = 0
        skipped_count = 0
        orphaned_count = 0

        for row in rows:
            data = {}
            for col_name, transform in field_specs:
                raw_val = row[col_name] if col_name in row.keys() else None
                if raw_val is None:
                    data[col_name] = None
                elif transform is bool:
                    data[col_name] = bool(raw_val)
                elif transform is int:
                    data[col_name] = int(raw_val)
                elif transform is float:
                    data[col_name] = float(raw_val)
                elif callable(transform):
                    data[col_name] = transform(raw_val)
                else:
                    data[col_name] = str(raw_val)

            # Check if record already exists in PostgreSQL
            existing = pg_db.query(model_class).filter_by(id=data["id"]).first()
            if existing:
                skipped_count += 1
                continue

            # Foreign key sanity check for child tables
            if table_name == "email_logs":
                pharm = pg_db.query(Pharmacy).filter_by(id=data["pharmacy_id"]).first()
                inv = pg_db.query(Invoice).filter_by(id=data["invoice_id"]).first()
                if not pharm or not inv:
                    print(f"  [INFO] Skipping orphaned {table_name} record {data['id']} (parent was deleted in SQLite history)")
                    orphaned_count += 1
                    continue

            try:
                record = model_class(**data)
                pg_db.add(record)
                pg_db.flush()
                migrated_count += 1
            except Exception as exc:
                pg_db.rollback()
                err_msg = f"Failed to insert record {data.get('id')} in '{table_name}': {exc}"
                print(f"  [ERROR] {err_msg}")
                errors.append(err_msg)

        pg_db.commit()
        summary[table_name] = (migrated_count, skipped_count, orphaned_count, len(rows))
        status_detail = f"{migrated_count} migrated, {skipped_count} existing"
        if orphaned_count:
            status_detail += f", {orphaned_count} orphaned skipped"
        print(f"  ✓ {table_name:<16}: {status_detail} (Total source: {len(rows)})")

    sqlite_conn.close()
    pg_db.close()

    print("\n" + "=" * 65)
    print("MIGRATION SUMMARY")
    print("=" * 65)
    for tbl, (mig, skip, orph, tot) in summary.items():
        print(f"{tbl.capitalize()} migrated: {mig} (Existing: {skip}, Source: {tot})")

    if errors:
        print(f"\nCompleted with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\nMigration completed successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate MedGuard AI SQLite to PostgreSQL")
    parser.add_argument(
        "--sqlite-path",
        default=str(ROOT_DIR / "backend" / "data" / "medguard.db"),
        help="Path to SQLite database file",
    )
    parser.add_argument(
        "--postgres-url",
        default=settings.clean_database_url,
        help="Target PostgreSQL connection URL (e.g. postgresql://...)",
    )
    args = parser.parse_args()
    migrate(args.sqlite_path, args.postgres_url)
