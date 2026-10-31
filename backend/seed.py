import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models import (
    User,
    Pharmacy,
    Medicine,
    Supplier,
    Batch,
    Inventory,
    StockMovement,
)
from backend.app.dependencies import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_pharm = db.query(Pharmacy).first()
        if existing_pharm:
            print("Database already contains data. Skipping initial seeding.")
            return

        print("Seeding initial MedGuard AI database...")

        # 1. Create Demo Pharmacist Users
        user1 = User(
            id=str(uuid.uuid4()),
            email="apollo.indiranagar@medguard.io",
            password_hash=hash_password("Password@123"),
            name="Dr. Rajesh Sharma",
            phone="+91 98765 43210",
            role="pharmacist",
            is_active=True,
            is_verified=True,
        )
        db.add(user1)

        user2 = User(
            id=str(uuid.uuid4()),
            email="medplus.koramangala@medguard.io",
            password_hash=hash_password("Password@123"),
            name="Priya Venkatesh",
            phone="+91 98450 12345",
            role="pharmacist",
            is_active=True,
            is_verified=True,
        )
        db.add(user2)
        db.flush()

        # 2. Create Pharmacies
        pharm1 = Pharmacy(
            id=str(uuid.uuid4()),
            owner_user_id=user1.id,
            name="Apollo Care Pharmacy - Indiranagar",
            owner_name="Dr. Rajesh Sharma",
            phone="+91 98765 43210",
            email="apollo.indiranagar@medguard.io",
            address="100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
            city="Bengaluru",
            state="Karnataka",
            pincode="560038",
            latitude=12.9719,
            longitude=77.6412,
            license_number="DL-KA-2023-88741",
            near_expiry_threshold_days=30,
        )
        db.add(pharm1)

        pharm2 = Pharmacy(
            id=str(uuid.uuid4()),
            owner_user_id=user2.id,
            name="MedPlus Wellness - Koramangala",
            owner_name="Priya Venkatesh",
            phone="+91 98450 12345",
            email="medplus.koramangala@medguard.io",
            address="80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034",
            city="Bengaluru",
            state="Karnataka",
            pincode="560034",
            latitude=12.9352,
            longitude=77.6245,
            license_number="DL-KA-2022-55219",
            near_expiry_threshold_days=30,
        )
        db.add(pharm2)
        db.flush()

        # 3. Create Suppliers for Pharmacy 1
        sup1 = Supplier(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            name="Cipla Healthcare Distributors",
            contact_person="Ramesh Kumar",
            phone="+91 98111 22334",
            email="orders@cipladist.in",
            address="Peenya Industrial Area, Phase 1, Bengaluru",
            gst_number="29AAAAA0000A1Z5",
        )
        db.add(sup1)

        sup2 = Supplier(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            name="Sun Pharma Logistics",
            contact_person="Anil Mehta",
            phone="+91 98222 33445",
            email="supply@sunpharmabengaluru.com",
            address="Electronic City, Phase 2, Bengaluru",
            gst_number="29BBBBB1111B2Z6",
        )
        db.add(sup2)
        db.flush()

        # 4. Create Medicines for Pharmacy 1
        med1 = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            name="Dolo 650",
            generic_name="Paracetamol",
            brand="Micro Labs",
            strength="650mg",
            category="Antipyretic / Analgesic",
            manufacturer="Micro Labs Ltd",
            pieces_per_strip=15,
            unit_of_measure="tablet",
        )
        db.add(med1)

        med2 = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            name="Augmentin 625 Duo",
            generic_name="Amoxicillin + Clavulanic Acid",
            brand="GSK",
            strength="625mg",
            category="Antibiotic",
            manufacturer="GlaxoSmithKline",
            pieces_per_strip=10,
            unit_of_measure="tablet",
        )
        db.add(med2)

        med3 = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            name="Pan 40",
            generic_name="Pantoprazole",
            brand="Alkem",
            strength="40mg",
            category="Antacid / PPI",
            manufacturer="Alkem Laboratories",
            pieces_per_strip=15,
            unit_of_measure="tablet",
        )
        db.add(med3)
        db.flush()

        # 5. Create Batches & Inventory for Pharmacy 1
        today = date.today()

        # Batch 1 for Dolo 650 (Expiring in 6 months)
        b1 = Batch(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med1.id,
            supplier_id=sup1.id,
            batch_number="DL-2026-X1",
            manufacturing_date=today - timedelta(days=60),
            expiry_date=today + timedelta(days=180),
            mrp_per_strip=34.0,
        )
        db.add(b1)
        db.flush()

        inv1 = Inventory(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med1.id,
            batch_id=b1.id,
            pieces_per_strip=15,
            total_pieces=150,  # 10 strips
            price_per_strip=34.0,
            price_per_piece=34.0 / 15.0,
            min_stock_pieces=30,
        )
        db.add(inv1)

        mov1 = StockMovement(
            pharmacy_id=pharm1.id,
            medicine_id=med1.id,
            batch_id=b1.id,
            movement_type="initial_stock",
            pieces_quantity=150,
            balance_after=150,
            reference_id="INIT-SEED",
            notes="Initial pharmacy stock seed",
        )
        db.add(mov1)

        # Batch 2 for Dolo 650 (Expiring in 20 days -> near expiry for FEFO)
        b2 = Batch(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med1.id,
            supplier_id=sup1.id,
            batch_number="DL-2026-EARLY",
            manufacturing_date=today - timedelta(days=300),
            expiry_date=today + timedelta(days=20),
            mrp_per_strip=32.0,
        )
        db.add(b2)
        db.flush()

        inv2 = Inventory(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med1.id,
            batch_id=b2.id,
            pieces_per_strip=15,
            total_pieces=45,  # 3 strips
            price_per_strip=32.0,
            price_per_piece=32.0 / 15.0,
            min_stock_pieces=30,
        )
        db.add(inv2)

        # Batch 3 for Augmentin 625 Duo
        b3 = Batch(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med2.id,
            supplier_id=sup2.id,
            batch_number="AUG-9912",
            manufacturing_date=today - timedelta(days=40),
            expiry_date=today + timedelta(days=365),
            mrp_per_strip=205.0,
        )
        db.add(b3)
        db.flush()

        inv3 = Inventory(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm1.id,
            medicine_id=med2.id,
            batch_id=b3.id,
            pieces_per_strip=10,
            total_pieces=80,  # 8 strips
            price_per_strip=205.0,
            price_per_piece=20.5,
            min_stock_pieces=20,
        )
        db.add(inv3)

        # 6. Medicines for Pharmacy 2
        med2_1 = Medicine(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm2.id,
            name="Dolo 650",
            generic_name="Paracetamol",
            brand="Micro Labs",
            strength="650mg",
            category="Antipyretic",
            manufacturer="Micro Labs",
            pieces_per_strip=15,
            unit_of_measure="tablet",
        )
        db.add(med2_1)
        db.flush()

        b2_1 = Batch(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm2.id,
            medicine_id=med2_1.id,
            batch_number="MEDPLUS-DOLO-01",
            expiry_date=today + timedelta(days=200),
            mrp_per_strip=33.5,
        )
        db.add(b2_1)
        db.flush()

        inv2_1 = Inventory(
            id=str(uuid.uuid4()),
            pharmacy_id=pharm2.id,
            medicine_id=med2_1.id,
            batch_id=b2_1.id,
            pieces_per_strip=15,
            total_pieces=120,
            price_per_strip=33.5,
            price_per_piece=33.5 / 15.0,
            min_stock_pieces=20,
        )
        db.add(inv2_1)

        db.commit()
        print("Database successfully seeded with pharmacies, medicines, batches, and inventory!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
