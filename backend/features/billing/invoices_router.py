"""MedGuard AI - Invoices Router (Billing Feature)"""

from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.shared.config import settings
from backend.features.billing.models import Invoice
from backend.features.billing.schemas import InvoiceOut
from backend.shared.email.email_service import send_invoice_email_task
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.get("", response_model=List[InvoiceOut])
def list_invoices(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all issued invoices for the current pharmacy."""
    invoices = db.query(Invoice).filter(Invoice.pharmacy_id == pharmacy.id).order_by(Invoice.created_at.desc()).all()
    return [InvoiceOut.model_validate(inv) for inv in invoices]


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """Download or view the generated tax invoice PDF."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_file_path = Path(settings.STORAGE_DIR) / "invoices" / f"{invoice.invoice_number}.pdf"
    if not pdf_file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        path=str(pdf_file_path),
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf",
    )


@router.post("/{invoice_id}/resend-email")
def resend_invoice_email(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Queue background re-sending of tax invoice to customer email."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.pharmacy_id == pharmacy.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.customer_email:
        raise HTTPException(status_code=400, detail="Invoice does not have a customer email address")

    pdf_file_path = Path(settings.STORAGE_DIR) / "invoices" / f"{invoice.invoice_number}.pdf"
    background_tasks.add_task(
        send_invoice_email_task,
        pharmacy_id=pharmacy.id,
        invoice_id=invoice.id,
        recipient_email=invoice.customer_email,
        customer_name=invoice.customer_name,
        invoice_number=invoice.invoice_number,
        total_amount=invoice.total_amount,
        pdf_path=str(pdf_file_path) if pdf_file_path.exists() else None,
    )

    return {"success": True, "message": f"Email queued for delivery to {invoice.customer_email}"}
