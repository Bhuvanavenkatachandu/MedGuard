"""MedGuard AI - Pharmacy Tool (Chatbot Feature)

Retrieves store metadata (operating address, phone, contact details)
for assistant context.
"""

from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from backend.features.pharmacy.models import Pharmacy


class PharmacyTool:
    """Tool for fetching verified pharmacy contact information."""

    @classmethod
    def get_pharmacy_details(cls, db: Session, pharmacy_id: str) -> Optional[Dict[str, Any]]:
        pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
        if not pharmacy:
            return None

        return {
            "id": pharmacy.id,
            "name": pharmacy.name,
            "address": pharmacy.address,
            "phone": pharmacy.phone,
            "email": pharmacy.email,
            "city": pharmacy.city,
            "state": pharmacy.state,
            "pincode": pharmacy.pincode,
            "license_number": pharmacy.license_number,
        }
