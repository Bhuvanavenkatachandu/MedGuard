"""MedGuard AI - Sales Router (Billing Feature)"""

from typing import List
from fastapi import APIRouter, Depends, BackgroundTasks, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.billing.models import Sale
from backend.features.billing.schemas import SaleCheckoutRequest, SaleCheckoutResponse
from backend.features.billing.sales_service import checkout_sale
from backend.shared.auth.dependencies import get_current_user, get_current_pharmacy

router = APIRouter(prefix="/api/sales", tags=["Sales & POS"])


@router.get("")
def list_sales(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all past sales transactions for the authenticated pharmacy."""
    sales = (
        db.query(Sale)
        .filter(Sale.pharmacy_id == pharmacy.id)
        .order_by(Sale.created_at.desc())
        .all()
    )
    results = []
    for s in sales:
        items = [
            {
                "id": it.id,
                "medicine_id": it.medicine_id,
                "batch_id": it.batch_id,
                "unit_type": it.unit_type,
                "quantity_units": it.quantity_units,
                "pieces_count": it.pieces_count,
                "unit_price": it.unit_price,
                "total_price": it.total_price,
                "medicine_name": it.medicine.name if it.medicine else "Medicine",
                "batch_number": it.batch.batch_number if it.batch else "N/A",
            }
            for it in s.items
        ]
        results.append({
            "id": s.id,
            "pharmacy_id": s.pharmacy_id,
            "customer_id": s.customer_id,
            "pharmacist_id": s.pharmacist_id,
            "sale_number": s.sale_number,
            "subtotal": s.subtotal,
            "discount_amount": s.discount_amount,
            "tax_amount": s.tax_amount,
            "total_amount": s.total_amount,
            "payment_method": s.payment_method,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "items": items,
            "customers": {
                "name": s.customer.name,
                "phone": s.customer.phone,
                "email": s.customer.email,
            } if s.customer else None,
        })
    return results


@router.post("/checkout", response_model=SaleCheckoutResponse, status_code=status.HTTP_201_CREATED)
def post_checkout_sale(
    req: SaleCheckoutRequest,
    background_tasks: BackgroundTasks,
    pharmacy=Depends(get_current_pharmacy),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Execute POS checkout transaction: deduct inventory, issue invoice, generate PDF."""
    return checkout_sale(
        db=db,
        pharmacy=pharmacy,
        pharmacist=current_user,
        req=req,
        background_tasks=background_tasks,
    )
