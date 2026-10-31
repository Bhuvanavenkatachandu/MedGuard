from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.pharmacy import PharmacyCreateRequest, PharmacyUpdateRequest, PharmacyOut

def create_pharmacy_for_user(db: Session, user: User, req: PharmacyCreateRequest) -> PharmacyOut:
    existing = db.query(Pharmacy).filter(Pharmacy.owner_user_id == user.id).first()
    if existing:
        # User already has a pharmacy, update fields and return
        existing.name = req.name.strip()
        existing.owner_name = (req.ownerName or req.owner_name or user.name).strip()
        existing.phone = req.phone.strip()
        if req.email:
            existing.email = req.email.strip()
        existing.address = req.address.strip()
        if req.city:
            existing.city = req.city.strip()
        if req.state:
            existing.state = req.state.strip()
        if req.pincode:
            existing.pincode = req.pincode.strip()
        existing.latitude = float(req.latitude)
        existing.longitude = float(req.longitude)
        if req.licenseNumber or req.license_number:
            existing.license_number = (req.licenseNumber or req.license_number).strip()
        db.commit()
        db.refresh(existing)
        return PharmacyOut.model_validate(existing)

    new_pharmacy = Pharmacy(
        owner_user_id=user.id,
        name=req.name.strip(),
        owner_name=(req.ownerName or req.owner_name or user.name).strip(),
        phone=req.phone.strip(),
        email=req.email.strip() if req.email else user.email,
        address=req.address.strip(),
        city=req.city.strip() if req.city else None,
        state=req.state.strip() if req.state else None,
        pincode=req.pincode.strip() if req.pincode else None,
        latitude=float(req.latitude),
        longitude=float(req.longitude),
        license_number=(req.licenseNumber or req.license_number).strip() if (req.licenseNumber or req.license_number) else None,
        near_expiry_threshold_days=req.near_expiry_threshold_days or 30,
    )
    db.add(new_pharmacy)
    db.commit()
    db.refresh(new_pharmacy)
    return PharmacyOut.model_validate(new_pharmacy)

def get_pharmacy_by_user(db: Session, user: User) -> Optional[PharmacyOut]:
    pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == user.id).first()
    if not pharmacy:
        return None
    return PharmacyOut.model_validate(pharmacy)

def update_pharmacy(db: Session, pharmacy: Pharmacy, req: PharmacyUpdateRequest) -> PharmacyOut:
    if req.name is not None:
        pharmacy.name = req.name.strip()
    if req.owner_name is not None:
        pharmacy.owner_name = req.owner_name.strip()
    if req.phone is not None:
        pharmacy.phone = req.phone.strip()
    if req.email is not None:
        pharmacy.email = req.email.strip()
    if req.address is not None:
        pharmacy.address = req.address.strip()
    if req.city is not None:
        pharmacy.city = req.city.strip()
    if req.state is not None:
        pharmacy.state = req.state.strip()
    if req.pincode is not None:
        pharmacy.pincode = req.pincode.strip()
    if req.latitude is not None:
        pharmacy.latitude = float(req.latitude)
    if req.longitude is not None:
        pharmacy.longitude = float(req.longitude)
    if req.license_number is not None:
        pharmacy.license_number = req.license_number.strip()
    if req.near_expiry_threshold_days is not None:
        pharmacy.near_expiry_threshold_days = req.near_expiry_threshold_days

    db.commit()
    db.refresh(pharmacy)
    return PharmacyOut.model_validate(pharmacy)
