from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.search_session import SearchSession
from backend.app.schemas.public import PublicMedicineSearchItem
from backend.app.services.search_service import search_nearby_medicines

router = APIRouter(prefix="/api/public", tags=["Public Discovery"])

class SearchSessionRequest(BaseModel):
    session_token: str
    search_query: Optional[str] = None
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

@router.get("/medicines/search", response_model=List[PublicMedicineSearchItem])
def search_medicines(
    query: Optional[str] = Query(None, description="Search term for medicine or active ingredient"),
    lat: float = Query(12.9784, description="User latitude"),
    lng: float = Query(77.6408, description="User longitude"),
    max_distance_km: float = Query(100.0, description="Max distance radius in kilometers"),
    session_token: Optional[str] = Query(None, description="Search session token for analytics"),
    db: Session = Depends(get_db),
):
    return search_nearby_medicines(
        db=db,
        query=query,
        user_lat=lat,
        user_lng=lng,
        max_distance_km=max_distance_km,
        session_token=session_token,
    )

@router.post("/search-session")
def record_search_session(
    req: SearchSessionRequest,
    db: Session = Depends(get_db),
):
    session_record = SearchSession(
        session_token=req.session_token,
        search_query=req.search_query,
        user_lat=req.user_lat,
        user_lng=req.user_lng,
    )
    db.add(session_record)
    db.commit()
    return {"success": True}

@router.get("/pharmacies")
def get_public_pharmacies(db: Session = Depends(get_db)):
    pharmacies = db.query(Pharmacy).all()
    results = []
    for p in pharmacies:
        results.append({
            "id": p.id,
            "name": p.name,
            "address": p.address,
            "phone": p.phone,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "city": p.city,
            "state": p.state,
        })
    return results
