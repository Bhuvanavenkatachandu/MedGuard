"""MedGuard AI - Inventory Tool (Chatbot Feature)

Provides verified live inventory lookups for the pharmacy assistant.
Communicates with the Medicines and Inventory feature services instead
of executing duplicate raw SQL inside the chatbot.
"""

from typing import Any, Dict, List
from sqlalchemy.orm import Session

from backend.features.medicines.service import MedicineService
from backend.features.inventory.service import get_inventory_for_medicine


class InventoryTool:
    """Tool for fetching real-time medicine availability and pricing."""

    @classmethod
    def search_inventory(
        cls,
        db: Session,
        pharmacy_id: str,
        query: str,
        is_pharmacist: bool = False,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        clean_query = (query or "").strip()
        if not clean_query:
            return []

        # Delegate lookup to Medicine feature service
        medicines = MedicineService.search_medicines(
            db=db,
            pharmacy_id=pharmacy_id,
            query=clean_query,
            limit=limit,
        )

        results = []
        for med in medicines:
            # Delegate inventory retrieval to Inventory feature service
            inv_records = get_inventory_for_medicine(db, pharmacy_id, med.id)

            total_pieces = sum(item.total_pieces for item in inv_records)
            price_per_strip = (
                inv_records[0].price_per_strip if inv_records and inv_records[0].price_per_strip > 0
                else (inv_records[0].price_per_piece * (med.pieces_per_strip or 10) if inv_records else 0.0)
            )

            in_stock = total_pieces > 0

            if is_pharmacist:
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
                results.append({
                    "name": med.name,
                    "generic_name": med.generic_name,
                    "brand": med.brand,
                    "strength": med.strength,
                    "status": "In Stock" if in_stock else "Out of Stock",
                    "price_per_strip": price_per_strip if price_per_strip > 0 else "Contact Store",
                })

        return results
