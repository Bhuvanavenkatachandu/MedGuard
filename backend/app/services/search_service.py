import math
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.pharmacy import Pharmacy
from backend.app.models.medicine import Medicine
from backend.app.models.batch import Batch
from backend.app.models.inventory import Inventory
from backend.app.models.search_session import SearchSession
from backend.app.schemas.public import PublicMedicineSearchItem

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def search_nearby_medicines(
    db: Session,
    query: Optional[str] = None,
    user_lat: float = 12.9784,
    user_lng: float = 77.6408,
    max_distance_km: float = 100.0,
    session_token: Optional[str] = None,
) -> List[PublicMedicineSearchItem]:
    today = date.today()
    clean_query = query.strip().lower() if query else ""

    # Query active inventory with valid batches, medicines, and pharmacies
    rows = (
        db.query(Inventory, Medicine, Batch, Pharmacy)
        .join(Medicine, Medicine.id == Inventory.medicine_id)
        .join(Batch, Batch.id == Inventory.batch_id)
        .join(Pharmacy, Pharmacy.id == Inventory.pharmacy_id)
        .filter(
            Batch.expiry_date >= today,
            Inventory.total_pieces > 0,
        )
        .all()
    )

    # Aggregate by (medicine_id, pharmacy_id)
    aggregated = {}

    for inv, med, batch, pharm in rows:
        # Check query match if query is specified
        if clean_query:
            med_text = f"{med.name} {med.generic_name or ''} {med.brand or ''} {med.strength or ''}".lower()
            if clean_query not in med_text:
                continue

        dist_km = haversine_distance_km(user_lat, user_lng, pharm.latitude, pharm.longitude)
        if dist_km > max_distance_km:
            continue

        key = (med.id, pharm.id)
        if key not in aggregated:
            directions_url = f"https://www.google.com/maps/dir/?api=1&origin={user_lat},{user_lng}&destination={pharm.latitude},{pharm.longitude}"
            aggregated[key] = {
                "medicine_id": med.id,
                "medicine_name": med.name,
                "generic_name": med.generic_name,
                "brand": med.brand,
                "strength": med.strength,
                "category": med.category,
                "pharmacy_id": pharm.id,
                "pharmacy_name": pharm.name,
                "pharmacy_address": pharm.address,
                "pharmacy_phone": pharm.phone,
                "pharmacy_lat": pharm.latitude,
                "pharmacy_lng": pharm.longitude,
                "distance_km": dist_km,
                "available_pieces": 0,
                "pieces_per_strip": inv.pieces_per_strip or 10,
                "price_per_piece": inv.price_per_piece,
                "price_per_strip": inv.price_per_strip,
                "directions_url": directions_url,
            }

        aggregated[key]["available_pieces"] += inv.total_pieces
        # Take the maximum price if multiple batches
        if inv.price_per_strip > aggregated[key]["price_per_strip"]:
            aggregated[key]["price_per_strip"] = inv.price_per_strip
            aggregated[key]["price_per_piece"] = inv.price_per_piece

    results = []
    for data in aggregated.values():
        pps = data["pieces_per_strip"] if data["pieces_per_strip"] > 0 else 10
        total_p = data["available_pieces"]
        data["available_strips"] = total_p // pps
        data["loose_pieces"] = total_p % pps
        results.append(PublicMedicineSearchItem(**data))

    # Sort results by closest distance first
    results.sort(key=lambda x: x.distance_km)

    # Log search session
    try:
        token = session_token or f"SS-{int(today.strftime('%Y%m%d'))}-{len(results)}"
        session_record = SearchSession(
            session_token=token,
            search_query=query,
            user_lat=user_lat,
            user_lng=user_lng,
            results_count=len(results),
        )
        db.add(session_record)
        db.commit()
    except Exception:
        db.rollback()

    return results
