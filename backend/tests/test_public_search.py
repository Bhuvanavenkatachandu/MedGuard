from datetime import date, timedelta

def test_public_customer_search_and_haversine(client):
    # Search for Dolo 650 near Bangalore center
    res = client.get("/api/public/medicines/search", params={
        "query": "Dolo",
        "lat": 12.9719,
        "lng": 77.6412,
        "max_distance_km": 50,
    })
    assert res.status_code == 200
    items = res.json()
    # If seeded or added, we check items structure
    for it in items:
        assert "medicine_name" in it
        assert "pharmacy_name" in it
        assert "distance_km" in it
        assert "directions_url" in it
        assert "available_strips" in it
        assert "loose_pieces" in it
        assert "maps/dir" in it["directions_url"]

def test_public_search_session_logging(client):
    res = client.post("/api/public/search-session", json={
        "session_token": "TEST-SESSION-001",
        "search_query": "Paracetamol",
        "user_lat": 12.97,
        "user_lng": 77.64,
    })
    assert res.status_code == 200
    assert res.json()["success"] is True
