import sys
import random
import time
from datetime import date, timedelta
import httpx

BASE_URL = "http://localhost:8000/api"

def run_e2e_audit():
    print("=" * 70)
    print("MEDGUARD AI — COMPREHENSIVE FULL-STACK INTEGRATION TEST")
    print("=" * 70)

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health Check
    print("\n[Step 1] Verifying System Health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    print(f"  PASS: {health_data['service']} (DB: {health_data['database']})")

    # 2. Public Customer Medicine Search
    print("\n[Step 2] Testing Public Customer Search (Zero Login Required)...")
    r = client.get("/public/medicines/search", params={"query": "Dolo", "lat": 12.9784, "lng": 77.6408})
    assert r.status_code == 200, f"Public search failed: {r.text}"
    results = r.json()
    assert len(results) >= 1, "Expected at least 1 medicine in public search"
    item = results[0]
    print(f"  PASS: Found '{item['medicine_name']}' at '{item['pharmacy_name']}' ({item['distance_km']} km away)")
    print(f"        Stock: {item['available_pieces']} pieces ({item['available_strips']} strips, {item['loose_pieces']} loose)")
    print(f"        Directions: {item['directions_url'][:60]}...")

    # 3. Pharmacist Registration
    print("\n[Step 3] Testing Pharmacist Registration...")
    unique_email = f"e2e_pharmacist_{int(time.time())}_{random.randint(100, 999)}@gmail.com"
    reg_payload = {
        "email": unique_email,
        "password": "Password@12345",
        "fullName": "Bhuvan Chandu",
        "phone": "+91 98480 22338",
    }
    r = client.post("/auth/register", json=reg_payload)
    assert r.status_code == 201, f"Registration failed: {r.text}"
    reg_data = r.json()
    token = reg_data["access_token"]
    user_id = reg_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  PASS: User registered: {reg_data['user']['email']} (ID: {user_id})")

    # 4. Verify Route Guard Pre-Setup State
    print("\n[Step 4] Checking Pre-Setup State (isSetupComplete == False)...")
    r = client.get("/pharmacies/me", headers=headers)
    assert r.status_code == 404, "Expected 404 for unconfigured pharmacy"
    print("  PASS: Properly identifies setup incomplete (User redirected to /pharmacist/setup)")

    # 5. Pharmacy Setup & Location Confirmation
    print("\n[Step 5] Completing Pharmacy Setup & Location...")
    setup_payload = {
        "name": "MedGuard City Central Pharmacy",
        "ownerName": "Bhuvan Chandu",
        "phone": "+91 98480 22338",
        "email": unique_email,
        "address": "Shop 4, Residency Road, Shanthala Nagar, Bengaluru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560025",
        "latitude": 12.9698,
        "longitude": 77.6015,
        "licenseNumber": "DL-KA-2026-9081",
        "near_expiry_threshold_days": 30,
    }
    r = client.post("/pharmacies", headers=headers, json=setup_payload)
    assert r.status_code == 201, f"Pharmacy setup failed: {r.text}"
    pharm_data = r.json()
    pharm_id = pharm_data["id"]
    print(f"  PASS: Pharmacy created: '{pharm_data['name']}' (ID: {pharm_id})")

    # 6. Verify Post-Setup State
    print("\n[Step 6] Checking Post-Setup State (isSetupComplete == True)...")
    r = client.get("/pharmacies/me", headers=headers)
    assert r.status_code == 200, f"Failed to retrieve pharmacy: {r.text}"
    me_r = client.get("/auth/me", headers=headers)
    assert me_r.json()["pharmacy_id"] == pharm_id
    print("  PASS: Authenticated user atomically linked to their own pharmacy!")

    # 7. Add Supplier
    print("\n[Step 7] Adding Pharmaceutical Supplier...")
    supp_payload = {
        "name": "Apollo Logistics & Distribution Ltd",
        "contact_person": "Venkatesh Rao",
        "phone": "+91 98222 11000",
        "email": "orders@apollodist.com",
        "address": "Warehouse 12, Peenya, Bengaluru",
        "gst_number": "29ABCDE1234F1Z5",
    }
    r = client.post("/suppliers", headers=headers, json=supp_payload)
    assert r.status_code == 201, f"Supplier creation failed: {r.text}"
    supp_id = r.json()["id"]
    print(f"  PASS: Supplier created: {r.json()['name']}")

    # 8. Inward Stock Addition (Dynamic Strips & Pieces)
    print("\n[Step 8] Inward Stock Addition (FEFO Batches)...")
    today = date.today()
    exp_early = (today + timedelta(days=25)).strftime("%Y-%m-%d")   # Expiring soon batch
    exp_normal = (today + timedelta(days=300)).strftime("%Y-%m-%d") # Fresh batch

    # Batch 1 (Early expiry: 4 strips * 10 = 40 pieces)
    stock1 = {
        "medicine_name": "Amoxicillin 500mg",
        "generic_name": "Amoxicillin",
        "brand": "Mox 500",
        "strength": "500mg",
        "category": "Antibiotic",
        "manufacturer": "Sun Pharma",
        "batch_number": "MOX-EARLY-25D",
        "supplier_id": supp_id,
        "expiry_date": exp_early,
        "pieces_per_strip": 10,
        "quantity_strips": 4,
        "price_per_strip": 85.0,
        "min_stock_pieces": 20,
    }
    r1 = client.post("/inventory", headers=headers, json=stock1)
    assert r1.status_code == 201, f"Stock 1 addition failed: {r1.text}"
    inv1 = r1.json()
    b1_id = inv1["batch_id"]
    med_id = inv1["medicine_id"]
    print(f"  PASS: Added Batch 1 ({inv1['total_pieces']} pieces / {inv1['available_strips']} strips, Exp: {exp_early})")

    # Batch 2 (Normal expiry: 10 strips * 10 = 100 pieces)
    stock2 = {
        "medicine_name": "Amoxicillin 500mg",
        "generic_name": "Amoxicillin",
        "brand": "Mox 500",
        "strength": "500mg",
        "batch_number": "MOX-FRESH-300D",
        "supplier_id": supp_id,
        "expiry_date": exp_normal,
        "pieces_per_strip": 10,
        "quantity_strips": 10,
        "price_per_strip": 85.0,
        "min_stock_pieces": 20,
    }
    r2 = client.post("/inventory", headers=headers, json=stock2)
    assert r2.status_code == 201, f"Stock 2 addition failed: {r2.text}"
    inv2 = r2.json()
    b2_id = inv2["batch_id"]
    print(f"  PASS: Added Batch 2 ({inv2['total_pieces']} pieces / {inv2['available_strips']} strips, Exp: {exp_normal})")

    # 9. Stock Adjustment Test
    print("\n[Step 9] Testing Manual Stock Adjustment...")
    r = client.put(f"/inventory/{inv1['id']}/adjust", headers=headers, json={"newTotalPieces": 37, "reason": "3 loose pieces broken"})
    assert r.status_code == 200, f"Adjustment failed: {r.text}"
    adj = r.json()
    assert adj["total_pieces"] == 37
    assert adj["available_strips"] == 3   # 37 // 10 = 3
    assert adj["loose_pieces"] == 7       # 37 % 10 = 7
    print(f"  PASS: Stock adjusted to 37 pieces -> Correctly computed: {adj['available_strips']} strips + {adj['loose_pieces']} loose pieces")

    # 10. FEFO Priority Verification
    print("\n[Step 10] Checking FEFO Dispatch Order...")
    r = client.get(f"/batches/fefo/{med_id}", headers=headers)
    assert r.status_code == 200, f"FEFO check failed: {r.text}"
    fefo_batches = r.json()
    assert fefo_batches[0]["batch_id"] == b1_id, "FEFO failure: Early batch must be first!"
    print(f"  PASS: FEFO correctly prioritizes '{fefo_batches[0]['batch_number']}' (Expires in {fefo_batches[0]['days_to_expiry']} days)")

    # 11. Point of Sale (POS) Checkout
    print("\n[Step 11] Executing POS Checkout...")
    checkout_payload = {
        "customer_data": {
            "name": "Kavitha Reddy",
            "phone": "+91 99887 76655",
            "email": "kavitha.reddy@gmail.com",
            "address": "402 Royal Enclave, Bengaluru",
        },
        "items": [
            {
                "medicine_id": med_id,
                "batch_id": b1_id,
                "unit_type": "strip",
                "quantity_units": 2,
                "pieces_count": 20,
                "unit_price": 85.0,
                "total_price": 170.0,
            }
        ],
        "subtotal": 170.0,
        "discount_amount": 10.0,
        "tax_amount": 8.0,
        "total_amount": 168.0,
        "payment_method": "Card",
    }
    r = client.post("/sales/checkout", headers=headers, json=checkout_payload)
    assert r.status_code == 201, f"Checkout failed: {r.text}"
    sale_res = r.json()
    invoice_id = sale_res["invoice_id"]
    print(f"  PASS: Sale processed! Sale No: {sale_res['sale_number']}, Invoice No: {sale_res['invoice_number']}")

    # 12. Verify Inventory Balance & Audit Movement
    print("\n[Step 12] Verifying Deducted Inventory & Audit Trail...")
    r = client.get("/inventory", headers=headers)
    updated_inv = next(i for i in r.json() if i["batch_id"] == b1_id)
    assert updated_inv["total_pieces"] == 17, f"Expected 17 pieces (37 - 20), got {updated_inv['total_pieces']}"
    assert updated_inv["available_strips"] == 1
    assert updated_inv["loose_pieces"] == 7
    print(f"  PASS: Batch 1 reduced from 37 to 17 pieces ({updated_inv['available_strips']} strip, {updated_inv['loose_pieces']} loose)")

    r = client.get("/movements", headers=headers)
    movements = r.json()
    assert any(m["movement_type"] == "sale" and m["pieces_quantity"] == -20 for m in movements)
    print("  PASS: Stock movement audit entry recorded with reference to sale!")

    # 13. PDF Download Verification
    print("\n[Step 13] Verifying Generated Invoice PDF Download...")
    r = client.get(f"/invoices/{invoice_id}/pdf")
    assert r.status_code == 200, f"PDF download failed: {r.text}"
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 1000
    print(f"  PASS: Invoice PDF successfully downloaded ({len(r.content)} bytes)")

    # 14. Returning User Login Flow
    print("\n[Step 14] Testing Returning Pharmacist Login Flow...")
    login_r = client.post("/auth/login", json={"email": unique_email, "password": "Password@12345"})
    assert login_r.status_code == 200, f"Login failed: {login_r.text}"
    login_data = login_r.json()
    new_token = login_data["access_token"]
    assert login_data["user"]["pharmacy_id"] == pharm_id, "Returning user must retain their pharmacy_id!"

    # Verify returning user gets their existing pharmacy directly (navigates to Dashboard, NOT setup!)
    ret_pharm = client.get("/pharmacies/me", headers={"Authorization": f"Bearer {new_token}"})
    assert ret_pharm.status_code == 200
    assert ret_pharm.json()["id"] == pharm_id
    assert ret_pharm.json()["name"] == "MedGuard City Central Pharmacy"
    print(f"  PASS: Returning user logged in -> Directly redirected to Dashboard for '{ret_pharm.json()['name']}'!")

    # 15. Reports & Analytics Summary
    print("\n[Step 15] Checking Analytics & Reports Summary...")
    r = client.get("/reports/summary", headers={"Authorization": f"Bearer {new_token}"})
    assert r.status_code == 200
    summary = r.json()
    print(f"  PASS: Total Revenue: ₹{summary['total_revenue']}, Today's Sales: {summary['todays_sales_count']}, Expiring Soon: {summary['expiring_soon_count']}")

    print("\n" + "=" * 70)
    print("ALL 15 INTEGRATION TEST PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_audit()
