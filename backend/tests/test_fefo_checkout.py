from datetime import date, timedelta

def test_fefo_checkout_deduction_and_invoice(client):
    # 1. Setup pharmacist and pharmacy
    reg = client.post("/api/auth/register", json={
        "email": "pos_tester@medguard.io",
        "password": "Password123!",
        "fullName": "POS Pharmacist",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/pharmacies", headers=headers, json={
        "name": "FEFO Meds Store",
        "phone": "+91 91111 22222",
        "address": "45 MG Road, Bengaluru",
        "latitude": 12.9750,
        "longitude": 77.6000,
        "license_number": "DL-FEFO-99",
    })

    today = date.today()
    exp_early = (today + timedelta(days=15)).strftime("%Y-%m-%d")
    exp_late = (today + timedelta(days=180)).strftime("%Y-%m-%d")

    # Add Batch 1 (Early expiry: 15 days, 3 strips = 30 pieces)
    res1 = client.post("/api/inventory", headers=headers, json={
        "medicine_name": "Azithromycin 500",
        "generic_name": "Azithromycin",
        "strength": "500mg",
        "batch_number": "AZ-EARLY-15D",
        "expiry_date": exp_early,
        "pieces_per_strip": 10,
        "quantity_strips": 3,
        "price_per_strip": 120.0,
    })
    inv1 = res1.json()
    batch1_id = inv1["batch_id"]
    med_id = inv1["medicine_id"]

    # Add Batch 2 (Late expiry: 180 days, 5 strips = 50 pieces)
    res2 = client.post("/api/inventory", headers=headers, json={
        "medicine_name": "Azithromycin 500",
        "generic_name": "Azithromycin",
        "strength": "500mg",
        "batch_number": "AZ-LATE-180D",
        "expiry_date": exp_late,
        "pieces_per_strip": 10,
        "quantity_strips": 5,
        "price_per_strip": 120.0,
    })
    inv2 = res2.json()
    batch2_id = inv2["batch_id"]

    # 2. Check FEFO batch endpoint returns early batch first
    fefo_res = client.get(f"/api/batches/fefo/{med_id}", headers=headers)
    assert fefo_res.status_code == 200
    fefo_list = fefo_res.json()
    assert len(fefo_list) == 2
    assert fefo_list[0]["batch_id"] == batch1_id  # Earliest expiry first!
    assert fefo_list[0]["batch_number"] == "AZ-EARLY-15D"

    # 3. Perform POS Checkout selling 1 strip (10 pieces) from the earliest batch
    checkout_payload = {
        "customer_data": {
            "name": "Rahul Verma",
            "phone": "9876543210",
            "email": "rahul.verma@example.com",
        },
        "items": [
            {
                "medicine_id": med_id,
                "batch_id": batch1_id,
                "unit_type": "strip",
                "quantity_units": 1,
                "pieces_count": 10,
                "unit_price": 120.0,
                "total_price": 120.0,
            }
        ],
        "subtotal": 120.0,
        "discount_amount": 10.0,
        "tax_amount": 5.5,
        "total_amount": 115.5,
        "payment_method": "UPI",
    }

    checkout_res = client.post("/api/sales/checkout", headers=headers, json=checkout_payload)
    assert checkout_res.status_code == 201
    sale_data = checkout_res.json()
    assert sale_data["success"] is True
    assert sale_data["customer_name"] == "Rahul Verma"
    assert "SALE-" in sale_data["sale_number"]
    assert "INV-" in sale_data["invoice_number"]

    # 4. Verify inventory deduction: Batch 1 had 30 pieces, now should have 20 pieces (2 strips, 0 loose)
    inv_list_res = client.get("/api/inventory", headers=headers)
    all_inv = inv_list_res.json()
    b1_inv = next(i for i in all_inv if i["batch_id"] == batch1_id)
    assert b1_inv["total_pieces"] == 20
    assert b1_inv["available_strips"] == 2
    assert b1_inv["loose_pieces"] == 0

    # 5. Check invoice PDF endpoint
    inv_id = sale_data["invoice_id"]
    pdf_res = client.get(f"/api/invoices/{inv_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # Generated valid PDF bytes
