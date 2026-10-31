def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "MedGuard" in data["service"]

def test_user_registration_and_login(client):
    reg_payload = {
        "email": "testpharmacist@medguard.io",
        "password": "SecurePassword123",
        "fullName": "Pharmacist Test User",
        "phone": "+91 99999 88888",
    }
    # 1. Register
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testpharmacist@medguard.io"
    assert data["user"]["role"] == "pharmacist"
    assert data["user"]["is_verified"] is True

    # 2. Login
    login_payload = {
        "email": "testpharmacist@medguard.io",
        "password": "SecurePassword123",
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["access_token"]
    assert token

    # 3. Get /me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "testpharmacist@medguard.io"
    assert me_data["name"] == "Pharmacist Test User"
