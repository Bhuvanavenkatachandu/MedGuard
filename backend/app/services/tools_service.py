"""MedGuard AI - Tools Service

Executes deterministic, schema-validated tools for the pharmacy assistant.
Ensures zero cross-pharmacy leakage by strictly filtering all queries
by `pharmacy_id`. Implements role-based visibility rules for inventory data.
"""

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.models.batch import Batch
from backend.app.models.inventory import Inventory
from backend.app.models.medicine import Medicine
from backend.app.models.pharmacy import Pharmacy

logger = logging.getLogger("medguard.tools_service")


class ToolsService:
    """Deterministic tool executors for live inventory and pharmacy info."""

    @classmethod
    def search_inventory(
        cls,
        db: Session,
        pharmacy_id: str,
        query: str,
        is_pharmacist: bool = False,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Search medicine inventory for a specific pharmacy.
        
        Args:
            db: SQLAlchemy session
            pharmacy_id: strictly scopes the search to one pharmacy
            query: search term (medicine name, generic name, brand)
            is_pharmacist: if True, returns detailed batch and reorder info;
                           if False (Customer), returns availability and price only.
            limit: max results to return
        """
        clean_query = (query or "").strip()
        if not clean_query:
            return []

        search_filter = f"%{clean_query}%"
        medicines = (
            db.query(Medicine)
            .filter(
                Medicine.pharmacy_id == pharmacy_id,
                or_(
                    Medicine.name.ilike(search_filter),
                    Medicine.generic_name.ilike(search_filter),
                    Medicine.brand.ilike(search_filter),
                ),
            )
            .limit(limit)
            .all()
        )

        results = []
        for med in medicines:
            # Query inventory items for this medicine
            inv_records = (
                db.query(Inventory)
                .filter(
                    Inventory.pharmacy_id == pharmacy_id,
                    Inventory.medicine_id == med.id,
                )
                .all()
            )

            total_pieces = sum(item.total_pieces for item in inv_records)
            price_per_strip = (
                inv_records[0].price_per_strip if inv_records and inv_records[0].price_per_strip > 0
                else (inv_records[0].price_per_piece * (med.pieces_per_strip or 10) if inv_records else 0.0)
            )

            in_stock = total_pieces > 0

            if is_pharmacist:
                # Pharmacists get operational details
                batches_info = []
                for item in inv_records:
                    if item.batch:
                        batches_info.append({
                            "batch_number": item.batch.batch_number,
                            "expiry_date": str(item.batch.expiry_date) if item.batch.expiry_date else None,
                            "stock_pieces": item.total_pieces,
                        })

                results.append({
                    "medicine_id": med.id,
                    "name": med.name,
                    "generic_name": med.generic_name,
                    "brand": med.brand,
                    "strength": med.strength,
                    "category": med.category,
                    "total_pieces": total_pieces,
                    "price_per_strip": price_per_strip,
                    "in_stock": in_stock,
                    "batches": batches_info,
                })
            else:
                # Customers only see public stock status and price
                results.append({
                    "name": med.name,
                    "generic_name": med.generic_name,
                    "brand": med.brand,
                    "strength": med.strength,
                    "status": "In Stock" if in_stock else "Out of Stock",
                    "price_per_strip": price_per_strip if price_per_strip > 0 else "Contact Store",
                })

        return results

    @classmethod
    def get_pharmacy_details(cls, db: Session, pharmacy_id: str) -> Optional[Dict[str, Any]]:
        """Fetch verified public contact and location details for a pharmacy."""
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
