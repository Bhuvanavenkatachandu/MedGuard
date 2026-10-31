from datetime import date, timedelta

def get_auth_token_and_pharmacy(client, email="invuser@medguard.io"):
    # Register user
    reg = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "fullName": "Inventory Pharmacist",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup pharmacy
    pharm_res = client.post("/api/pharmacies", headers=headers, json={
        "name": "LifeCare Pharmacy",
        "phone": "+91 98765 00000",
        "address": "123 Health Street, Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "license_number": "DL-TEST-001",
    })
    return headers, pharm_res.json()

def test_add_stock_and_dynamic_pieces_strips(client):
    headers, pharm = get_auth_token_and_pharmacy(client, "pharmacist_stock@medguard.io")
    exp_date = (date.today() + timedelta(days=120)).strftime("%Y-%m-%d")

    stock_payload = {
        "medicine_name": "Paracetamol 500mg",
        "generic_name": "Paracetamol",
        "brand": "Crocin",
        "strength": "500mg",
        "batch_number": "BATCH-P500-1",
        "expiry_date": exp_date,
        "pieces_per_strip": 10,
        "quantity_strips": 5,  # 5 strips = 50 pieces
        "price_per_strip": 25.0,
        "min_stock_pieces": 15,
    }

    add_res = client.post("/api/inventory", headers=headers, json=stock_payload)
    assert add_res.status_code == 201
    inv_data = add_res.json()
    assert inv_data["total_pieces"] == 50
    assert inv_data["available_strips"] == 5
    assert inv_data["loose_pieces"] == 0
    assert inv_data["price_per_strip"] == 25.0

    # Adjust stock: say 5 pieces were dispensed or damaged, now 45 pieces
    inv_id = inv_data["id"]
    adj_res = client.put(
        f"/api/inventory/{inv_id}/adjust",
        headers=headers,
        json={"newTotalPieces": 45, "reason": "Damaged pack write-off"}
    )
    assert adj_res.status_code == 200
    adj_data = adj_res.json()
    assert adj_data["total_pieces"] == 45
    # Strict requirement formula: 45 // 10 = 4 strips, 45 % 10 = 5 loose pieces
    assert adj_data["available_strips"] == 4
    assert adj_data["loose_pieces"] == 5
