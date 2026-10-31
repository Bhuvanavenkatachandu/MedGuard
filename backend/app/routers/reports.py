from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.sale import Sale
from backend.app.models.inventory import Inventory
from backend.app.models.batch import Batch
from backend.app.models.email_log import EmailLog
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/summary")
def get_reports_summary(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    today = date.today()
    pharmacy_id = pharmacy.id

    # Inventory Metrics
    inventory_items = db.query(Inventory, Batch).join(Batch, Batch.id == Inventory.batch_id).filter(Inventory.pharmacy_id == pharmacy_id).all()
    
    total_pieces = sum(i.total_pieces for i, b in inventory_items)
    total_inventory_value = sum(i.total_pieces * (i.price_per_piece or 0) for i, b in inventory_items)
    
    threshold_days = pharmacy.near_expiry_threshold_days or 30
    threshold_date = today + timedelta(days=threshold_days)

    expired_count = sum(1 for i, b in inventory_items if b.expiry_date < today)
    expiring_soon_count = sum(1 for i, b in inventory_items if today <= b.expiry_date <= threshold_date and i.total_pieces > 0)
    low_stock_count = sum(1 for i, b in inventory_items if b.expiry_date >= today and 0 < i.total_pieces <= i.min_stock_pieces)

    # Sales Metrics
    sales = db.query(Sale).filter(Sale.pharmacy_id == pharmacy_id).all()
    total_revenue = sum(s.total_amount for s in sales)
    
    today_start = datetime.combine(today, datetime.min.time())
    todays_sales = [s for s in sales if s.created_at and s.created_at >= today_start]
    todays_revenue = sum(s.total_amount for s in todays_sales)

    return {
        "total_pieces": total_pieces,
        "total_inventory_value": round(total_inventory_value, 2),
        "expired_batches_count": expired_count,
        "expiring_soon_count": expiring_soon_count,
        "low_stock_count": low_stock_count,
        "total_sales_count": len(sales),
        "total_revenue": round(total_revenue, 2),
        "todays_sales_count": len(todays_sales),
        "todays_revenue": round(todays_revenue, 2),
    }

@router.get("/email-logs")
def get_email_logs(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    logs = db.query(EmailLog).filter(EmailLog.pharmacy_id == pharmacy.id).order_by(EmailLog.created_at.desc()).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "pharmacy_id": l.pharmacy_id,
            "invoice_id": l.invoice_id,
            "recipient_email": l.recipient_email,
            "status": l.status,
            "error_message": l.error_message,
            "resend_id": l.resend_id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })
    return results
